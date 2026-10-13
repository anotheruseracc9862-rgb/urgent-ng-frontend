import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@urgent/api-client';
import { MediaUpload } from './MediaUpload';

const { apiMock } = vi.hoisted(() => ({ apiMock: vi.fn() }));

vi.mock('@/lib/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api/client')>();
  return { ...actual, api: apiMock };
});

class MockXHR extends EventTarget {
  static instances: MockXHR[] = [];
  readonly upload = new EventTarget();
  readonly headers = new Map<string, string>();
  status = 204;
  responseText = '';
  withCredentials = false;
  open = vi.fn();
  send = vi.fn(() => queueMicrotask(() => this.dispatchEvent(new Event('load'))));
  setRequestHeader = vi.fn((name: string, value: string) => this.headers.set(name, value));

  constructor() {
    super();
    MockXHR.instances.push(this);
  }

  abort() {
    this.dispatchEvent(new Event('abort'));
  }
}

class MockURL extends URL {
  static createObjectURL = vi.fn().mockReturnValue('blob:preview');
  static revokeObjectURL = vi.fn();
}

const media = {
  id: 'media-1',
  purpose: 'ERRAND_PHOTO',
  status: 'PENDING',
  moderationStatus: 'NONE',
  width: null,
  height: null,
  rejectionReason: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  confirmedAt: null,
  mimeType: 'image/png',
  sizeBytes: 4,
};

const uploadRequest = {
  media,
  upload: {
    method: 'PUT',
    url: '/api/v1/media/media-1/content',
    headers: { 'Content-Type': 'image/png' },
    expiresAt: '2026-01-01T00:15:00.000Z',
  },
};

function mockReadyFlow(purpose = 'ERRAND_PHOTO') {
  const requestedUpload = { ...uploadRequest, media: { ...media, purpose } };
  apiMock.mockImplementation(async (path: string) => {
    if (path === '/media/uploads') return requestedUpload;
    if (path === '/media/media-1/confirm') return { ...media, purpose, status: 'READY' };
    if (path === '/media/media-1/url') return { url: 'https://media.example/image.png', variant: 'full', expiresAt: '2026-01-01T00:05:00.000Z' };
    if (path === '/media/media-1') return { ...media, status: 'READY' };
    return undefined;
  });
}

beforeEach(() => {
  apiMock.mockReset();
  MockXHR.instances = [];
  vi.stubGlobal('XMLHttpRequest', MockXHR);
  vi.stubGlobal('crypto', { randomUUID: vi.fn().mockReturnValue('upload-intent-1') });
  vi.stubGlobal('URL', MockURL);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function choosePng() {
  const file = new File(['test'], 'tiny.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Choose images'), {
    target: { files: [file] },
  });
  return file;
}

describe('MediaUpload', () => {
  it('uploads bytes through the API, confirms, previews, and returns the ready media id', async () => {
    mockReadyFlow();
    const onChange = vi.fn();
    render(<MediaUpload purpose="ERRAND_PHOTO" onChange={onChange} />);

    choosePng();

    await waitFor(() => expect(screen.getByRole('img', { name: 'tiny.png' })).toHaveAttribute('src', 'https://media.example/image.png'));
    expect(await screen.findByLabelText('Ready')).toBeInTheDocument();
    expect(MockXHR.instances[0]?.open).toHaveBeenCalledWith('PUT', '/api/v1/media/media-1/content');
    expect(MockXHR.instances[0]?.withCredentials).toBe(true);
    expect(MockXHR.instances[0]?.headers.get('Content-Type')).toBe('image/png');
    expect(MockXHR.instances[0]?.send).toHaveBeenCalledWith(expect.any(File));
    expect(apiMock).toHaveBeenCalledWith('/media/uploads', expect.objectContaining({
      method: 'POST',
      headers: { 'Idempotency-Key': 'upload-intent-1' },
      body: { purpose: 'ERRAND_PHOTO', mimeType: 'image/png', sizeBytes: 4 },
    }));
    expect(onChange).toHaveBeenCalledWith(['media-1']);
  });

  it('shows the backend rejection reason', async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/media/uploads') return uploadRequest;
      if (path === '/media/media-1/confirm') return { ...media, status: 'PROCESSING' };
      if (path === '/media/media-1') return { ...media, status: 'REJECTED', rejectionReason: 'NOT_AN_IMAGE' };
      return undefined;
    });
    render(<MediaUpload purpose="ERRAND_PHOTO" />);

    choosePng();

    await waitFor(() => expect(screen.getByText(/not an image/i)).toBeInTheDocument(), { timeout: 5_000 });
  });

  it('polls once per second until processing is ready', async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/media/uploads') return uploadRequest;
      if (path === '/media/media-1/confirm') return { ...media, status: 'PROCESSING' };
      if (path === '/media/media-1') return { ...media, status: 'READY' };
      if (path === '/media/media-1/url') return { url: 'https://media.example/image.png', variant: 'full', expiresAt: '2026-01-01T00:05:00.000Z' };
      return undefined;
    });
    render(<MediaUpload purpose="ERRAND_PHOTO" />);

    choosePng();

    await waitFor(() => expect(screen.getByLabelText('Ready')).toBeInTheDocument(), { timeout: 5_000 });
    expect(apiMock.mock.calls.some(([path]) => path === '/media/media-1')).toBe(true);
  });

  it('keeps the idempotency key and permits retry after a network failure', async () => {
    mockReadyFlow();
    apiMock.mockImplementationOnce(async () => {
      throw new ApiError(0, 'NETWORK_ERROR', 'Connection lost.', undefined, 'req_upload_1');
    });
    const onChange = vi.fn();
    render(<MediaUpload purpose="ERRAND_PHOTO" onChange={onChange} />);

    choosePng();

    expect(await screen.findByText('Connection lost.')).toBeInTheDocument();
    expect(screen.getByText('Request ID: req_upload_1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry upload' }));

    expect(await screen.findByLabelText('Ready')).toBeInTheDocument();
    const requestCalls = apiMock.mock.calls.filter(([path]) => path === '/media/uploads');
    expect(requestCalls).toHaveLength(2);
    expect(requestCalls[0]?.[1]?.headers).toEqual(requestCalls[1]?.[1]?.headers);
    expect(onChange).toHaveBeenCalledWith(['media-1']);
  });

  it('deletes a profile photo through the API and removes its id from the value', async () => {
    mockReadyFlow('PROFILE_PHOTO');
    const onChange = vi.fn();
    render(<MediaUpload purpose="PROFILE_PHOTO" onChange={onChange} />);

    choosePng();
    await screen.findByLabelText('Ready');
    fireEvent.click(screen.getByRole('button', { name: 'Remove tiny.png' }));

    await waitFor(() => expect(screen.getByText('Add an image to continue.')).toBeInTheDocument());
    expect(apiMock).toHaveBeenCalledWith('/media/media-1', { method: 'DELETE' });
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('removes a ready errand image from the selection without deleting reusable media', async () => {
    mockReadyFlow();
    const onChange = vi.fn();
    render(<MediaUpload purpose="ERRAND_PHOTO" onChange={onChange} />);

    choosePng();
    await screen.findByLabelText('Ready');
    fireEvent.click(screen.getByRole('button', { name: 'Remove tiny.png' }));

    await waitFor(() => expect(screen.getByText('Add an image to continue.')).toBeInTheDocument());
    expect(apiMock).not.toHaveBeenCalledWith('/media/media-1', { method: 'DELETE' });
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('hydrates existing media ids from the controlled value and removes them when the value changes', async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === '/media/media-1') return { ...media, status: 'READY' };
      if (path === '/media/media-1/url') return { url: 'https://media.example/existing.png', variant: 'full', expiresAt: '2026-01-01T00:05:00.000Z' };
      return undefined;
    });
    const { rerender } = render(<MediaUpload purpose="ERRAND_PHOTO" value={['media-1']} />);

    await waitFor(() => expect(screen.getByRole('img', { name: 'Uploaded image' })).toHaveAttribute('src', 'https://media.example/existing.png'));
    rerender(<MediaUpload purpose="ERRAND_PHOTO" value={[]} />);

    expect(await screen.findByText('Add an image to continue.')).toBeInTheDocument();
  });

  it('rejects unsupported types before contacting the API', () => {
    render(<MediaUpload purpose="ERRAND_PHOTO" />);
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Choose images'), {
      target: { files: [file] },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('choose a JPEG, PNG, or WebP image');
    expect(apiMock).not.toHaveBeenCalled();
  });
});
