import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { listen, server } from '@/test/msw/server';
import { MediaUpload } from './MediaUpload';

/**
 * F0-09 acceptance: the real `api()` client and `XMLHttpRequest` run against MSW handlers built
 * from the OpenAPI contract. Nothing in the upload path is mocked at module level.
 */

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

const envelope = (data: unknown) => HttpResponse.json({ data, meta: {}, requestId: 'req-msw' });

function useUploadRoutes(confirmed: Record<string, unknown>, finalState = confirmed) {
  const calls: string[] = [];
  server.use(
    http.post('*/api/v1/media/uploads', () => {
      calls.push('request');
      return envelope({
        media,
        upload: {
          method: 'PUT',
          url: '/api/v1/media/media-1/content',
          headers: { 'Content-Type': 'image/png' },
          expiresAt: '2026-01-01T00:15:00.000Z',
        },
      });
    }),
    http.put('*/api/v1/media/media-1/content', () => {
      calls.push('bytes');
      return new HttpResponse(null, { status: 204 });
    }),
    http.post('*/api/v1/media/media-1/confirm', () => {
      calls.push('confirm');
      return envelope(confirmed);
    }),
    http.get('*/api/v1/media/media-1', () => envelope(finalState)),
    http.get('*/api/v1/media/media-1/url', () =>
      envelope({ url: 'https://media.example/image.png', variant: 'full', expiresAt: '2026-01-01T00:05:00.000Z' }),
    ),
  );
  return calls;
}

function choose(file: File) {
  fireEvent.change(screen.getByLabelText('Choose images'), { target: { files: [file] } });
}

beforeAll(() => listen());
beforeEach(() => {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:preview');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());

describe('MediaUpload through the API contract', () => {
  it('requests, uploads bytes, confirms and reports the ready media id', async () => {
    const calls = useUploadRoutes({ ...media, status: 'READY' });
    const onChange = vi.fn();
    render(<MediaUpload purpose="ERRAND_PHOTO" onChange={onChange} />);

    choose(new File(['test'], 'tiny.png', { type: 'image/png' }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(['media-1']), { timeout: 5_000 });
    expect(calls).toEqual(['request', 'bytes', 'confirm']);
    expect(screen.getByLabelText('Ready')).toBeInTheDocument();
  });

  it('shows a rejected file with the reason and no media id', async () => {
    useUploadRoutes({ ...media, status: 'REJECTED', rejectionReason: 'NOT_AN_IMAGE' });
    const onChange = vi.fn();
    render(<MediaUpload purpose="ERRAND_PHOTO" onChange={onChange} />);

    choose(new File(['not really a png'], 'fake.png', { type: 'image/png' }));

    expect(await screen.findByText(/not an image/i, undefined, { timeout: 5_000 })).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Ready')).not.toBeInTheDocument();
  });

  it('turns a transport error from the byte upload into a retryable failure', async () => {
    useUploadRoutes({ ...media, status: 'READY' });
    server.use(
      http.put('*/api/v1/media/media-1/content', () =>
        HttpResponse.json(
          { error: { code: 'MEDIA_INVALID', message: 'The file is not valid.' }, requestId: 'req-bad' },
          { status: 400 },
        ),
      ),
    );
    render(<MediaUpload purpose="ERRAND_PHOTO" onChange={vi.fn()} />);

    choose(new File(['test'], 'tiny.png', { type: 'image/png' }));

    expect(await screen.findByText('The file is not valid.', undefined, { timeout: 5_000 })).toBeInTheDocument();
  });
});
