import type { MemoryMedia } from '../types/domain';
import { storagePathFor } from './security';

export type UploadZone = 'memories' | 'people' | 'timeline' | 'legacy';

export interface PreparedUpload {
  familyId: string;
  memoryId: string;
  storagePath: string;
  mediaType: MemoryMedia['mediaType'];
  mimeType: string;
  bytes: number;
  publicUrlAllowed: false;
}

export function mediaTypeFromFile(file: Pick<File, 'type' | 'name'>): MemoryMedia['mediaType'] {
  if (file.type.startsWith('image/')) return 'photo';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'document';
}

export function validateMemoryUpload(file: Pick<File, 'size' | 'type' | 'name'>): string[] {
  const errors: string[] = [];
  const maxBytes = 2 * 1024 * 1024 * 1024;
  if (!file.name.trim()) errors.push('File must have a name.');
  if (file.size <= 0) errors.push('File is empty.');
  if (file.size > maxBytes) errors.push('File exceeds the 2 GB Phase 1 upload safety limit.');
  if (!file.type) errors.push('File type could not be detected.');
  return errors;
}

export function prepareMemoryUpload(familyId: string, memoryId: string, file: File, zone: UploadZone = 'memories'): PreparedUpload {
  const errors = validateMemoryUpload(file);
  if (errors.length) throw new Error(errors.join(' '));
  return {
    familyId,
    memoryId,
    storagePath: storagePathFor(familyId, memoryId, file.name, zone),
    mediaType: mediaTypeFromFile(file),
    mimeType: file.type,
    bytes: file.size,
    publicUrlAllowed: false
  };
}
