'use client';

import * as React from 'react';
import Image from 'next/image';
import { AlertCircle, Camera, CheckCircle, Loader2, Upload, X } from 'lucide-react';
import { MEDIA_UPLOAD_DEFAULTS } from '@urgent/config';
import { cn } from '@urgent/ui';
import {
  useMediaUpload,
  type MediaUploadItem,
  type UseMediaUploadOptions,
} from './use-media-upload';

export interface MediaUploadProps extends UseMediaUploadOptions {
  capture?: 'user' | 'environment';
}

export function MediaUpload({
  capture,
  ...options
}: MediaUploadProps) {
  const {
    files,
    validationError,
    canAddMore,
    addFiles,
    retryFile,
    removeFile,
  } = useMediaUpload(options);
  const [dragging, setDragging] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const accept = options.accept ?? MEDIA_UPLOAD_DEFAULTS.mimeTypes;
  const maxFiles = options.maxFiles ?? 5;
  const maxSizeBytes = options.maxSizeBytes ?? MEDIA_UPLOAD_DEFAULTS.maxBytes;

  const inputChanged = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.currentTarget.files) addFiles(event.currentTarget.files);
    event.currentTarget.value = '';
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        aria-label="Choose images"
        type="file"
        multiple={maxFiles > 1}
        accept={accept.join(',')}
        capture={capture}
        onChange={inputChanged}
        className="sr-only"
        disabled={!canAddMore}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        disabled={!canAddMore}
        className={cn(
          'flex w-full min-h-40 flex-col items-center justify-center rounded-[var(--r-lg)] border-2 border-dashed border-line bg-panel px-5 py-8 text-center transition-colors',
          'hover:border-lime-600 hover:bg-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-600',
          dragging && 'border-lime-600 bg-tint',
          !canAddMore && 'cursor-not-allowed opacity-60',
        )}
      >
        {capture
          ? <Camera className="mb-3 h-8 w-8 text-muted" aria-hidden="true" />
          : <Upload className="mb-3 h-8 w-8 text-muted" aria-hidden="true" />}
        <span className="text-sm font-semibold text-ink-2">
          {capture ? 'Take a photo or choose an image' : 'Choose images or drag them here'}
        </span>
        <span className="mt-1 text-xs text-muted">
          {accept.map((type) => type.split('/')[1]?.toUpperCase()).join(', ')} up to {Math.floor(maxSizeBytes / (1024 * 1024))} MB
        </span>
      </button>

      {validationError && <p role="alert" className="text-sm text-red">{validationError}</p>}
      {files.length === 0 ? (
        <p className="text-sm text-muted">Add an image to continue.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {files.map((file) => (
            <UploadCard
              key={file.key}
              file={file}
              onRetry={() => retryFile(file)}
              onRemove={() => removeFile(file)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function UploadCard({
  file,
  onRetry,
  onRemove,
}: {
  file: MediaUploadItem;
  onRetry: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="relative aspect-square overflow-hidden rounded-[var(--r)] border border-line bg-panel">
      {file.previewUrl ? (
        <Image
          src={file.previewUrl}
          alt={file.file?.name ?? 'Uploaded image'}
          fill
          unoptimized
          sizes="(max-width: 640px) 50vw, 33vw"
          className="object-cover"
        />
      ) : (
        <div aria-label="Loading image preview" className="h-full w-full animate-pulse bg-tint" />
      )}
      {file.status !== 'ready' && (
        <div className="absolute inset-0 flex items-center justify-center bg-ink/75 p-3 text-center text-white">
          {file.status === 'uploading' && (
            <div>
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" aria-hidden="true" />
              <p className="text-xs">Uploading {file.progress}%</p>
            </div>
          )}
          {file.status === 'processing' && (
            <div>
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" aria-hidden="true" />
              <p className="text-xs">Processing image…</p>
            </div>
          )}
          {file.status === 'loading' && (
            <div>
              <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" aria-hidden="true" />
              <p className="text-xs">Loading image…</p>
            </div>
          )}
          {(file.status === 'failed' || file.status === 'rejected') && (
            <div>
              <AlertCircle className="mx-auto mb-2 h-6 w-6 text-red" aria-hidden="true" />
              <p className="text-xs">{file.error ?? 'The image was rejected.'}</p>
              {file.requestId && <p className="mt-1 break-all text-[10px]">Request ID: {file.requestId}</p>}
              {file.status === 'failed' && file.removeFailed && (
                <button type="button" onClick={onRemove} className="mt-2 text-xs underline">
                  Retry removal
                </button>
              )}
              {file.status === 'failed' && file.file && !file.removeFailed && (
                <button type="button" onClick={onRetry} className="mt-2 text-xs underline">
                  Retry upload
                </button>
              )}
            </div>
          )}
        </div>
      )}
      {file.status === 'ready' && (
        <span className="absolute right-2 top-2 rounded-full bg-white p-1 text-ok">
          <CheckCircle className="h-5 w-5" aria-label="Ready" />
        </span>
      )}
      <button
        type="button"
        aria-label={`Remove ${file.file?.name ?? 'image'}`}
        onClick={onRemove}
        className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/80 text-white transition-colors hover:bg-ink"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </article>
  );
}
