'use client';

import * as React from 'react';
import type { components } from '@urgent/api-client';
import { MEDIA_UPLOAD_DEFAULTS } from '@urgent/config';
import { api, ApiError } from '@/lib/api/client';

type MediaDto = components['schemas']['MediaDto'];
type UploadRequestResult = components['schemas']['UploadRequestResultDto'];
type UploadTarget = components['schemas']['UploadTargetDto'];
export type MediaPurpose = components['schemas']['MediaPurpose'];
export type MediaFileStatus = 'loading' | 'uploading' | 'processing' | 'ready' | 'rejected' | 'failed';

export interface MediaUploadItem {
  key: string;
  file?: File;
  mediaId?: string;
  serverStatus?: MediaDto['status'];
  previewUrl?: string;
  status: MediaFileStatus;
  progress: number;
  error?: string;
  requestId?: string;
  idempotencyKey?: string;
  uploadRequest?: UploadRequestResult;
  uploadComplete?: boolean;
  removeFailed?: boolean;
}

export interface UseMediaUploadOptions {
  purpose: MediaPurpose;
  accept?: readonly string[];
  maxFiles?: number;
  value?: string[];
  onChange?: (mediaIds: string[]) => void;
  maxSizeBytes?: number;
}

interface UseMediaUploadResult {
  files: MediaUploadItem[];
  validationError?: string;
  canAddMore: boolean;
  addFiles: (files: FileList | File[]) => void;
  retryFile: (file: MediaUploadItem) => void;
  removeFile: (file: MediaUploadItem) => void;
}

const DEFAULT_ACCEPT = MEDIA_UPLOAD_DEFAULTS.mimeTypes;
const MAX_UPLOAD_BYTES = MEDIA_UPLOAD_DEFAULTS.maxBytes;
const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 30_000;

/** Stable backend rejection codes (`media.rejectionReason`) mapped to copy the user can act on. */
const REJECTION_COPY: Record<string, string> = {
  OBJECT_MISSING: 'The upload did not arrive. Try again.',
  TOO_LARGE: 'This image is too large. Choose a smaller one.',
  NOT_AN_IMAGE: 'This file is not an image. Choose a JPEG, PNG or WebP photo.',
  TYPE_MISMATCH: 'The file type does not match its content. Choose a different image.',
  CORRUPT_IMAGE: 'This image is damaged. Choose a different one.',
  TOO_MANY_PIXELS: 'This image is too large in pixels. Choose a smaller one.',
  MODERATION: 'This image cannot be used. Choose a different one.',
  PROCESSING_FAILED: 'We could not process this image. Try again or choose another.',
  UPLOAD_MISMATCH: 'The upload did not match what was requested. Try again.',
};

export function rejectionMessage(reason: string | null | undefined): string {
  return (reason && REJECTION_COPY[reason]) || 'The image was rejected. Choose a different one.';
}

function messageForError(error: unknown): { message: string; requestId?: string } {
  if (error instanceof ApiError) {
    return { message: error.message, requestId: error.requestId };
  }
  return {
    message: error instanceof Error ? error.message : 'The upload failed. Please try again.',
  };
}

function uploadPath(url: string): string {
  const target = new URL(url, window.location.origin);
  if (target.origin !== window.location.origin || !target.pathname.startsWith('/api/v1/media/')) {
    throw new Error('The server returned an unsafe upload route.');
  }
  return `${target.pathname}${target.search}`;
}

function xhrError(xhr: XMLHttpRequest): ApiError {
  try {
    const payload: unknown = JSON.parse(xhr.responseText);
    if (payload && typeof payload === 'object' && 'error' in payload) {
      const envelope = payload as {
        error?: { code?: string; message?: string; details?: unknown };
        requestId?: string;
      };
      return new ApiError(
        xhr.status,
        envelope.error?.code ?? `HTTP_${xhr.status}`,
        envelope.error?.message ?? 'The image could not be uploaded.',
        envelope.error?.details,
        envelope.requestId,
      );
    }
  } catch {
    // Non-JSON error responses use the generic upload error below.
  }
  return new ApiError(xhr.status, `HTTP_${xhr.status}`, 'The image could not be uploaded.');
}

function uploadBytes(
  url: string,
  target: UploadTarget,
  file: File,
  signal: AbortSignal,
  onProgress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const cleanup = () => signal.removeEventListener('abort', abort);
    const abort = () => xhr.abort();

    xhr.open(target.method, uploadPath(url));
    xhr.withCredentials = true;
    for (const [name, value] of Object.entries(target.headers)) {
      xhr.setRequestHeader(name, value);
    }
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener('load', () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(xhrError(xhr));
    });
    xhr.addEventListener('error', () => {
      cleanup();
      reject(new ApiError(0, 'NETWORK_ERROR', 'Network error while uploading the image.'));
    });
    xhr.addEventListener('abort', () => {
      cleanup();
      reject(new DOMException('The upload was cancelled.', 'AbortError'));
    });
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) {
      abort();
      return;
    }
    xhr.send(file);
  });
}

function waitForNextPoll(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, POLL_INTERVAL_MS);
    const abort = () => {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(new DOMException('The upload was cancelled.', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
  });
}

export function useMediaUpload({
  purpose,
  accept = DEFAULT_ACCEPT,
  maxFiles = 5,
  value,
  onChange,
  maxSizeBytes = MAX_UPLOAD_BYTES,
}: UseMediaUploadOptions): UseMediaUploadResult {
  const [files, setFiles] = React.useState<MediaUploadItem[]>([]);
  const [validationError, setValidationError] = React.useState<string>();
  const activeRequests = React.useRef(new Map<string, AbortController>());
  const filesRef = React.useRef(files);
  const selectedIds = React.useRef<string[]>(value ?? []);
  const previousValue = React.useRef<string[]>([]);
  const onChangeRef = React.useRef(onChange);

  React.useEffect(() => {
    filesRef.current = files;
  }, [files]);

  React.useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const updateFile = React.useCallback((key: string, updates: Partial<MediaUploadItem>) => {
    setFiles((current) => current.map((file) => (file.key === key ? { ...file, ...updates } : file)));
  }, []);

  const notifyChange = React.useCallback((ids: string[]) => {
    selectedIds.current = ids;
    onChangeRef.current?.(ids);
  }, []);

  const setMediaStatus = React.useCallback((key: string, media: MediaDto) => {
    updateFile(key, {
      mediaId: media.id,
      serverStatus: media.status,
      status: media.status === 'READY' ? 'ready' : media.status === 'REJECTED' ? 'rejected' : 'processing',
      error: media.status === 'REJECTED' ? rejectionMessage(media.rejectionReason) : undefined,
    });
  }, [updateFile]);

  const getPreviewUrl = React.useCallback(async (mediaId: string, signal: AbortSignal) => {
    const preview = await api<components['schemas']['MediaUrlDto']>(`/media/${mediaId}/url`, { signal });
    return preview.url;
  }, []);

  const pollUntilComplete = React.useCallback(async (
    key: string,
    mediaId: string,
    signal: AbortSignal,
    firstStatus?: MediaDto,
  ) => {
    const startedAt = Date.now();
    let media = firstStatus;
    while (!signal.aborted && Date.now() - startedAt <= POLL_TIMEOUT_MS) {
      if (media?.status === 'READY' || media?.status === 'REJECTED') break;
      if (media) setMediaStatus(key, media);
      await waitForNextPoll(signal);
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) break;

      try {
        media = await api<MediaDto>(`/media/${mediaId}`, { signal });
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== 'MEDIA_NOT_READY') throw error;
        media = undefined;
      }
    }

    if (signal.aborted) return;
    if (!media || (media.status !== 'READY' && media.status !== 'REJECTED')) {
      throw new Error('Image processing timed out. You can retry this upload.');
    }
    setMediaStatus(key, media);
    if (media.status === 'READY') {
      const previewUrl = await getPreviewUrl(mediaId, signal);
      updateFile(key, { previewUrl, status: 'ready', progress: 100 });
      const ids = selectedIds.current.includes(mediaId)
        ? selectedIds.current
        : [...selectedIds.current, mediaId];
      notifyChange(ids);
    }
  }, [getPreviewUrl, notifyChange, setMediaStatus, updateFile]);

  const uploadFile = React.useCallback(async (file: MediaUploadItem) => {
    if (!file.file) return;
    const controller = new AbortController();
    activeRequests.current.get(file.key)?.abort();
    activeRequests.current.set(file.key, controller);
    updateFile(file.key, { status: 'uploading', progress: 0, error: undefined, requestId: undefined });
    let mediaId = file.mediaId;

    try {
      const idempotencyKey = file.idempotencyKey ?? crypto.randomUUID();
      const uploadRequest = file.uploadRequest ?? await api<UploadRequestResult>('/media/uploads', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: { purpose, mimeType: file.file.type, sizeBytes: file.file.size },
        signal: controller.signal,
      });
      mediaId = uploadRequest.media.id;
      updateFile(file.key, {
        uploadRequest,
        mediaId: uploadRequest.media.id,
        serverStatus: uploadRequest.media.status,
        idempotencyKey,
      });

      if (!file.uploadComplete) {
        await uploadBytes(
          uploadRequest.upload.url,
          uploadRequest.upload,
          file.file,
          controller.signal,
          (progress) => updateFile(file.key, { progress }),
        );
        updateFile(file.key, { uploadComplete: true });
      }
      updateFile(file.key, { status: 'processing', progress: 100 });

      const media = await api<MediaDto>(`/media/${uploadRequest.media.id}/confirm`, {
        method: 'POST',
        signal: controller.signal,
      });
      if (media.status !== 'READY' && media.status !== 'REJECTED') {
        updateFile(file.key, { status: 'processing', serverStatus: media.status });
        await pollUntilComplete(file.key, media.id, controller.signal, media);
      } else {
        setMediaStatus(file.key, media);
        if (media.status === 'READY') {
          const previewUrl = await getPreviewUrl(media.id, controller.signal);
          updateFile(file.key, { previewUrl, progress: 100 });
          const ids = selectedIds.current.includes(media.id)
            ? selectedIds.current
            : [...selectedIds.current, media.id];
          notifyChange(ids);
        }
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const { message, requestId } = messageForError(error);
      updateFile(file.key, {
        status: error instanceof ApiError && error.code === 'MEDIA_INVALID'
          ? 'rejected'
          : error instanceof ApiError && error.code === 'MEDIA_NOT_READY' && mediaId
            ? 'processing'
            : 'failed',
        error: message,
        requestId,
      });
      if (error instanceof ApiError && error.code === 'MEDIA_NOT_READY' && mediaId) {
        try {
          await pollUntilComplete(file.key, mediaId, controller.signal);
        } catch (pollError) {
          if (!controller.signal.aborted) {
            const failure = messageForError(pollError);
            updateFile(file.key, { status: 'failed', error: failure.message, requestId: failure.requestId });
          }
        }
      }
    } finally {
      if (activeRequests.current.get(file.key) === controller) activeRequests.current.delete(file.key);
    }
  }, [getPreviewUrl, notifyChange, pollUntilComplete, purpose, setMediaStatus, updateFile]);

  const hydrateMedia = React.useCallback(async (file: MediaUploadItem) => {
    const controller = new AbortController();
    activeRequests.current.set(file.key, controller);
    try {
      const media = await api<MediaDto>(`/media/${file.key}`, { signal: controller.signal });
      if (media.purpose !== purpose) {
        throw new ApiError(403, 'FORBIDDEN', 'You cannot use this image for this purpose.');
      }
      setMediaStatus(file.key, media);
      if (media.status === 'READY') {
        updateFile(file.key, { previewUrl: await getPreviewUrl(media.id, controller.signal) });
      } else if (media.status !== 'REJECTED') {
        await pollUntilComplete(file.key, media.id, controller.signal, media);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      const { message, requestId } = messageForError(error);
      updateFile(file.key, { status: 'failed', error: message, requestId });
    } finally {
      if (activeRequests.current.get(file.key) === controller) activeRequests.current.delete(file.key);
    }
  }, [getPreviewUrl, pollUntilComplete, purpose, setMediaStatus, updateFile]);

  React.useEffect(() => {
    const nextValue = value ?? [];
    const previous = previousValue.current;
    if (previous.length === nextValue.length && previous.every((id, index) => id === nextValue[index])) return;

    const removedIds = new Set(previous.filter((id) => !nextValue.includes(id)));
    for (const id of removedIds) {
      const removedFile = files.find((file) => file.mediaId === id);
      activeRequests.current.get(removedFile?.key ?? id)?.abort();
      setFiles((current) => {
        const removed = current.find((file) => file.mediaId === id);
        if (removed?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(removed.previewUrl);
        return current.filter((file) => file.mediaId !== id);
      });
    }
    selectedIds.current = [...nextValue];
    previousValue.current = [...nextValue];

    const knownIds = new Set(files.map((file) => file.mediaId ?? file.key));
    for (const id of nextValue) {
      if (knownIds.has(id)) continue;
      const existing: MediaUploadItem = { key: id, mediaId: id, status: 'loading', progress: 0 };
      setFiles((current) => current.some((file) => file.mediaId === id || file.key === id) ? current : [...current, existing]);
      void hydrateMedia(existing);
    }
  }, [files, hydrateMedia, value]);

  React.useEffect(() => () => {
    for (const controller of activeRequests.current.values()) controller.abort();
    activeRequests.current.clear();
    // A remount (React Strict Mode, Suspense) must hydrate the value again; the aborted requests never finish.
    previousValue.current = [];
    for (const file of filesRef.current) {
      if (file.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(file.previewUrl);
    }
  }, []);

  const addFiles = React.useCallback((selected: FileList | File[]) => {
    setValidationError(undefined);
    const added: MediaUploadItem[] = [];
    for (const file of Array.from(selected)) {
      if (!accept.includes(file.type)) {
        setValidationError(`${file.name}: choose a JPEG, PNG, or WebP image.`);
        continue;
      }
      if (file.size < 1 || file.size > maxSizeBytes) {
        setValidationError(`${file.name}: the image must be at most ${Math.floor(maxSizeBytes / (1024 * 1024))} MB.`);
        continue;
      }
      if (files.length + added.length >= maxFiles) {
        setValidationError(`You can upload up to ${maxFiles} images.`);
        break;
      }
      added.push({
        key: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: 'uploading',
        progress: 0,
      });
    }
    if (added.length) {
      setFiles((current) => [...current, ...added]);
      added.forEach((file) => void uploadFile(file));
    }
  }, [accept, files.length, maxFiles, maxSizeBytes, uploadFile]);

  const removeFile = React.useCallback(async (file: MediaUploadItem) => {
    activeRequests.current.get(file.key)?.abort();
    const mayDeleteOnServer = file.serverStatus === 'PENDING'
      || file.serverStatus === 'REJECTED'
      || purpose === 'PROFILE_PHOTO';
    if (file.mediaId && mayDeleteOnServer) {
      try {
        await api<void>(`/media/${file.mediaId}`, { method: 'DELETE' });
      } catch (error) {
        const { message, requestId } = messageForError(error);
        updateFile(file.key, {
          status: 'failed',
          error: `Could not remove this image. ${message}`,
          requestId,
          removeFailed: true,
        });
        return;
      }
      notifyChange(selectedIds.current.filter((id) => id !== file.mediaId));
    } else if (file.mediaId) {
      notifyChange(selectedIds.current.filter((id) => id !== file.mediaId));
    }
    if (file.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(file.previewUrl);
    setFiles((current) => current.filter((candidate) => candidate.key !== file.key));
  }, [notifyChange, purpose, updateFile]);

  return {
    files,
    validationError,
    canAddMore: files.length < maxFiles,
    addFiles,
    retryFile: (file) => void uploadFile(file),
    removeFile: (file) => void removeFile(file),
  };
}
