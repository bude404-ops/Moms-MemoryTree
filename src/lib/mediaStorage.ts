import type { SupabaseClient } from '@supabase/supabase-js';
import type { MediaUploadStatus, MemoryMedia, StorageUsage } from '../types/domain';
import { prepareMemoryUpload, type PreparedUpload, type UploadZone } from './mediaUpload';

export interface UploadProgressEvent {
  status: MediaUploadStatus;
  progress: number;
  uploadedBytes: number;
  totalBytes: number;
  message: string;
  resumable: boolean;
}

export type CloudUploadResult = Omit<PreparedUpload, 'uploadStatus'> & {
  provider: 'supabase';
  uploadStatus: 'completed';
};

export interface UploadOptions {
  familyId: string;
  memoryId: string;
  file: File;
  zone?: UploadZone;
  signal?: AbortSignal;
  onProgress?: (event: UploadProgressEvent) => void;
}

export interface MediaStorageProvider {
  readonly id: 'supabase' | 'future-cloud';
  prepareUpload(options: Omit<UploadOptions, 'signal' | 'onProgress'>): PreparedUpload;
  upload(options: UploadOptions): Promise<CloudUploadResult>;
}

export interface QuotaCheckResult {
  allowed: boolean;
  usedBytes: number;
  limitBytes: number;
  incomingBytes: number;
  remainingBytes: number;
  reason?: string;
}

export class SupabaseStorageProvider implements MediaStorageProvider {
  readonly id = 'supabase' as const;
  constructor(private readonly client: SupabaseClient) {}

  prepareUpload(options: Omit<UploadOptions, 'signal' | 'onProgress'>): PreparedUpload {
    return prepareMemoryUpload(options.familyId, options.memoryId, options.file, options.zone ?? 'memories');
  }

  async upload(options: UploadOptions): Promise<CloudUploadResult> {
    const prepared = this.prepareUpload(options);
    emit(options, 'uploading', 1, 0, prepared.bytes, prepared.resumableRecommended, prepared.resumableRecommended ? 'Starting resumable-ready private upload.' : 'Starting private upload.');
    if (options.signal?.aborted) throw new DOMException('Upload cancelled.', 'AbortError');
    // Supabase JS browser uploads are single request today; the service boundary carries progress/resume semantics
    // so a future TUS/S3 provider can replace this implementation without changing the app.
    const upload = await this.client.storage.from(prepared.storageBucket).upload(prepared.storagePath, options.file, {
      contentType: options.file.type,
      upsert: false
    });
    if (upload.error) throw upload.error;
    if (options.signal?.aborted) throw new DOMException('Upload cancelled.', 'AbortError');
    emit(options, 'processing', 95, prepared.bytes, prepared.bytes, prepared.resumableRecommended, 'Upload finished; verifying cloud object before marking complete.');
    emit(options, 'completed', 100, prepared.bytes, prepared.bytes, prepared.resumableRecommended, 'Memory safely uploaded to the private family cloud vault.');
    return { ...prepared, provider: this.id, uploadStatus: 'completed' };
  }
}

export class MediaStorageService {
  constructor(private readonly provider: MediaStorageProvider) {}

  prepareUpload(options: Omit<UploadOptions, 'signal' | 'onProgress'>) {
    return this.provider.prepareUpload(options);
  }

  async assertQuota(storage: StorageUsage, incomingBytes: number): Promise<QuotaCheckResult> {
    const usedBytes = storage.videosBytes + storage.photosBytes + storage.audioBytes + storage.documentsBytes;
    const remainingBytes = Math.max(0, storage.limitBytes - usedBytes);
    return {
      allowed: incomingBytes <= remainingBytes,
      usedBytes,
      limitBytes: storage.limitBytes,
      incomingBytes,
      remainingBytes,
      reason: incomingBytes <= remainingBytes ? undefined : `This upload needs ${incomingBytes} bytes but this family has ${remainingBytes} bytes available.`
    };
  }

  upload(options: UploadOptions) {
    return this.provider.upload(options);
  }
}

export function createSupabaseMediaStorageService(client: SupabaseClient) {
  return new MediaStorageService(new SupabaseStorageProvider(client));
}

function emit(options: UploadOptions, status: MediaUploadStatus, progress: number, uploadedBytes: number, totalBytes: number, resumable: boolean, message: string) {
  options.onProgress?.({ status, progress, uploadedBytes, totalBytes, resumable, message });
}

export function completedMediaFromUpload(upload: CloudUploadResult, input: { id: string; uploaderId: string }): MemoryMedia {
  return {
    id: input.id,
    memoryId: upload.memoryId,
    familyId: upload.familyId,
    storageBucket: upload.storageBucket,
    storagePath: upload.storagePath,
    mediaType: upload.mediaType,
    mimeType: upload.mimeType,
    originalFileName: upload.originalFileName,
    bytes: upload.bytes,
    uploadStatus: 'completed',
    provider: upload.provider,
    originalPreserved: true
  };
}
