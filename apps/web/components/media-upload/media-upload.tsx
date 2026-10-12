'use client';

import * as React from 'react';
import { Upload, X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '@urgent/ui';

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'ready' | 'rejected' | 'error';

interface MediaFile {
  id: string;
  file: File;
  preview: string;
  status: UploadStatus;
  progress: number;
  uploadUrl?: string;
  mediaId?: string;
  error?: string;
}

interface MediaUploadProps {
  maxFiles?: number;
  maxSizeMB?: number;
  accept?: string[];
  onFilesChange?: (files: MediaFile[]) => void;
  purpose: 'ERRAND_IMAGE' | 'PROFILE_PHOTO' | 'ID_DOCUMENT' | 'RECEIPT' | 'EVIDENCE';
}

export function MediaUpload({
  maxFiles = 5,
  maxSizeMB = 10,
  accept = ['image/jpeg', 'image/png', 'image/webp'],
  onFilesChange,
  purpose,
}: MediaUploadProps) {
  const [files, setFiles] = React.useState<MediaFile[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles: MediaFile[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // Validate file type
      if (!accept.includes(file.type)) {
        continue;
      }

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        continue;
      }

      // Check max files limit
      if (files.length + newFiles.length >= maxFiles) {
        break;
      }

      const preview = URL.createObjectURL(file);
      const id = crypto.randomUUID();

      newFiles.push({
        id,
        file,
        preview,
        status: 'idle',
        progress: 0,
      });
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      onFilesChange?.(updatedFiles);

      // Start upload for each new file
      newFiles.forEach(uploadFile);
    }
  };

  const uploadFile = async (mediaFile: MediaFile) => {
    try {
      // Update status to uploading
      updateFileStatus(mediaFile.id, { status: 'uploading', progress: 0 });

      // Step 1: Request upload URL from API
      const uploadResponse = await fetch('/api/v1/media/uploads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: mediaFile.file.name,
          contentType: mediaFile.file.type,
          purpose,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadUrl, mediaId } = await uploadResponse.json();

      updateFileStatus(mediaFile.id, { uploadUrl, mediaId });

      // Step 2: Upload file to the provided URL
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          updateFileStatus(mediaFile.id, { progress });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          // Step 3: Poll for processing status
          pollProcessingStatus(mediaFile.id, mediaId);
        } else {
          updateFileStatus(mediaFile.id, {
            status: 'error',
            error: 'Upload failed',
          });
        }
      });

      xhr.addEventListener('error', () => {
        updateFileStatus(mediaFile.id, {
          status: 'error',
          error: 'Network error',
        });
      });

      xhr.open('PUT', uploadUrl);
      xhr.setRequestHeader('Content-Type', mediaFile.file.type);
      xhr.send(mediaFile.file);
    } catch (error) {
      updateFileStatus(mediaFile.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  };

  const pollProcessingStatus = async (fileId: string, mediaId: string) => {
    updateFileStatus(fileId, { status: 'processing' });

    const maxAttempts = 20;
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(`/api/v1/media/${mediaId}`);
        if (!response.ok) throw new Error('Failed to check status');

        const data = await response.json();

        if (data.status === 'READY') {
          updateFileStatus(fileId, { status: 'ready' });
        } else if (data.status === 'REJECTED') {
          updateFileStatus(fileId, {
            status: 'rejected',
            error: data.rejectionReason || 'File rejected',
          });
        } else if (data.status === 'PROCESSING') {
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(poll, 2000);
          } else {
            updateFileStatus(fileId, {
              status: 'error',
              error: 'Processing timeout',
            });
          }
        }
      } catch (error) {
        updateFileStatus(fileId, {
          status: 'error',
          error: 'Failed to check processing status',
        });
      }
    };

    poll();
  };

  const updateFileStatus = (
    fileId: string,
    updates: Partial<Omit<MediaFile, 'id' | 'file' | 'preview'>>
  ) => {
    setFiles((prev) => {
      const updated = prev.map((f) =>
        f.id === fileId ? { ...f, ...updates } : f
      );
      onFilesChange?.(updated);
      return updated;
    });
  };

  const removeFile = (fileId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId);
      if (file) {
        URL.revokeObjectURL(file.preview);
      }
      const updated = prev.filter((f) => f.id !== fileId);
      onFilesChange?.(updated);
      return updated;
    });
  };

  const retryUpload = (fileId: string) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      uploadFile(file);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed border-line rounded-[var(--r-lg)] p-8 text-center cursor-pointer transition-colors',
          'hover:border-lime-600 hover:bg-tint',
          files.length >= maxFiles && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          accept={accept.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="sr-only"
          disabled={files.length >= maxFiles}
        />
        <Upload className="w-8 h-8 mx-auto mb-3 text-muted" />
        <p className="text-sm font-semibold text-ink-2 mb-1">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-muted">
          {accept.map((t) => t.split('/')[1]).join(', ').toUpperCase()} up to {maxSizeMB}MB
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="relative aspect-square rounded-[var(--r)] overflow-hidden bg-panel border border-line"
            >
              <img
                src={file.preview}
                alt={file.file.name}
                className="w-full h-full object-cover"
              />

              {/* Status overlay */}
              {file.status !== 'ready' && (
                <div className="absolute inset-0 bg-ink/80 flex items-center justify-center">
                  {file.status === 'uploading' && (
                    <div className="text-center text-white">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      <p className="text-xs">{file.progress}%</p>
                    </div>
                  )}
                  {file.status === 'processing' && (
                    <div className="text-center text-white">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
                      <p className="text-xs">Processing...</p>
                    </div>
                  )}
                  {file.status === 'rejected' && (
                    <div className="text-center text-white">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red" />
                      <p className="text-xs">{file.error}</p>
                      <button
                        onClick={() => removeFile(file.id)}
                        className="mt-2 text-xs underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {file.status === 'error' && (
                    <div className="text-center text-white">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red" />
                      <p className="text-xs">{file.error}</p>
                      <button
                        onClick={() => retryUpload(file.id)}
                        className="mt-2 text-xs underline"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                </div>
              )}

              {file.status === 'ready' && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="w-5 h-5 text-ok bg-white rounded-full" />
                </div>
              )}

              <button
                onClick={() => removeFile(file.id)}
                className="absolute top-2 left-2 w-6 h-6 rounded-full bg-ink/80 text-white flex items-center justify-center hover:bg-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
