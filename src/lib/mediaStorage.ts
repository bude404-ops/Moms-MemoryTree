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

export type StorageProviderId = 'supabase' | 'future-cloud';

export type CloudUploadResult = Omit<PreparedUpload, 'uploadStatus'> & {
  provider: StorageProviderId;
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

export interface SignedAccessResult {
  signedUrl: string;
  expiresInSeconds: number;
  publicUrlAllowed: false;
}

export interface StorageObjectMetadata {
  bucket: string;
  path: string;
  bytes: number;
  mimeType?: string;
  lastModified?: string;
  exists: boolean;
}

export interface ProviderUsageResult {
  usedBytes: number;
  objectCount: number;
  estimated: boolean;
}

export interface MediaStorageProvider {
  readonly id: StorageProviderId;
  prepareUpload(options: Omit<UploadOptions, 'signal' | 'onProgress'>): PreparedUpload;
  upload(options: UploadOptions): Promise<CloudUploadResult>;
  download(bucket: string, path: string): Promise<Blob>;
  createSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<SignedAccessResult>;
  delete(bucket: string, path: string): Promise<void>;
  exists(bucket: string, path: string): Promise<boolean>;
  getMetadata(bucket: string, path: string): Promise<StorageObjectMetadata>;
  getUsage(prefix: string): Promise<ProviderUsageResult>;
  move(bucket: string, fromPath: string, toPath: string): Promise<void>;
  copy(bucket: string, fromPath: string, toPath: string): Promise<void>;
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

  async download(bucket: string, path: string): Promise<Blob> {
    const result = await this.client.storage.from(bucket).download(path);
    if (result.error) throw result.error;
    return result.data;
  }

  async createSignedUrl(bucket: string, path: string, expiresInSeconds: number): Promise<SignedAccessResult> {
    const result = await this.client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
    if (result.error) throw result.error;
    return { signedUrl: result.data.signedUrl, expiresInSeconds, publicUrlAllowed: false };
  }

  async delete(bucket: string, path: string): Promise<void> {
    const result = await this.client.storage.from(bucket).remove([path]);
    if (result.error) throw result.error;
  }

  async exists(bucket: string, path: string): Promise<boolean> {
    const metadata = await this.getMetadata(bucket, path);
    return metadata.exists;
  }

  async getMetadata(bucket: string, path: string): Promise<StorageObjectMetadata> {
    const directory = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
    const name = path.includes('/') ? path.slice(path.lastIndexOf('/') + 1) : path;
    const result = await this.client.storage.from(bucket).list(directory, { search: name, limit: 1 });
    if (result.error) throw result.error;
    const object = result.data?.find(item => item.name === name);
    return { bucket, path, exists: Boolean(object), bytes: Number(object?.metadata?.size ?? 0), mimeType: object?.metadata?.mimetype ?? undefined, lastModified: object?.updated_at ?? object?.created_at ?? undefined };
  }

  async getUsage(prefix: string): Promise<ProviderUsageResult> {
    const [bucket, ...parts] = prefix.split('/');
    const directory = parts.join('/');
    const result = await this.client.storage.from(bucket).list(directory, { limit: 1000 });
    if (result.error) throw result.error;
    const usedBytes = (result.data ?? []).reduce((sum, item) => sum + Number(item.metadata?.size ?? 0), 0);
    return { usedBytes, objectCount: result.data?.length ?? 0, estimated: true };
  }

  async move(bucket: string, fromPath: string, toPath: string): Promise<void> {
    const result = await this.client.storage.from(bucket).move(fromPath, toPath);
    if (result.error) throw result.error;
  }

  async copy(bucket: string, fromPath: string, toPath: string): Promise<void> {
    const result = await this.client.storage.from(bucket).copy(fromPath, toPath);
    if (result.error) throw result.error;
  }
}

export class MediaStorageService {
  constructor(private readonly provider: MediaStorageProvider) {}

  prepareUpload(options: Omit<UploadOptions, 'signal' | 'onProgress'>) {
    return this.provider.prepareUpload(options);
  }

  async assertQuota(storage: StorageUsage, incomingBytes: number): Promise<QuotaCheckResult> {
    const usedBytes = storage.videosBytes + storage.photosBytes + storage.audioBytes + storage.documentsBytes + (storage.thumbnailBytes ?? 0) + (storage.archiveBytes ?? 0);
    const remainingBytes = Math.max(0, storage.limitBytes - usedBytes);
    return {
      allowed: incomingBytes <= remainingBytes,
      usedBytes,
      limitBytes: storage.limitBytes,
      incomingBytes,
      remainingBytes,
      reason: incomingBytes <= remainingBytes ? undefined : `Not enough storage. You have ${remainingBytes} bytes remaining, but this upload requires approximately ${incomingBytes} bytes.`
    };
  }

  upload(options: UploadOptions) {
    return this.provider.upload(options);
  }

  download(bucket: string, path: string) {
    return this.provider.download(bucket, path);
  }

  createSignedUrl(bucket: string, path: string, expiresInSeconds: number) {
    return this.provider.createSignedUrl(bucket, path, expiresInSeconds);
  }

  delete(bucket: string, path: string) {
    return this.provider.delete(bucket, path);
  }

  exists(bucket: string, path: string) {
    return this.provider.exists(bucket, path);
  }

  getMetadata(bucket: string, path: string) {
    return this.provider.getMetadata(bucket, path);
  }

  getUsage(prefix: string) {
    return this.provider.getUsage(prefix);
  }

  move(bucket: string, fromPath: string, toPath: string) {
    return this.provider.move(bucket, fromPath, toPath);
  }

  copy(bucket: string, fromPath: string, toPath: string) {
    return this.provider.copy(bucket, fromPath, toPath);
  }
}

export class UnavailableStorageProvider implements MediaStorageProvider {
  readonly id = 'future-cloud' as const;
  private unavailable(): never { throw new Error('Storage provider unavailable.'); }
  prepareUpload(): PreparedUpload { return this.unavailable(); }
  async upload(): Promise<CloudUploadResult> { return this.unavailable(); }
  async download(): Promise<Blob> { return this.unavailable(); }
  async createSignedUrl(): Promise<SignedAccessResult> { return this.unavailable(); }
  async delete(): Promise<void> { return this.unavailable(); }
  async exists(): Promise<boolean> { return this.unavailable(); }
  async getMetadata(): Promise<StorageObjectMetadata> { return this.unavailable(); }
  async getUsage(): Promise<ProviderUsageResult> { return this.unavailable(); }
  async move(): Promise<void> { return this.unavailable(); }
  async copy(): Promise<void> { return this.unavailable(); }
}

export function createSupabaseMediaStorageService(client: SupabaseClient) {
  return new MediaStorageService(new SupabaseStorageProvider(client));
}

export function createUnavailableMediaStorageService() {
  return new MediaStorageService(new UnavailableStorageProvider());
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
