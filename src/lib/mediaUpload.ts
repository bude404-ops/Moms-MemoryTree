import type { MemoryMedia } from '../types/domain';
import { storagePathFor } from './security';

export type UploadZone = 'memories' | 'people' | 'timeline' | 'legacy';

export interface PreparedUpload {
  familyId: string;
  memoryId: string;
  storageBucket: 'family-media';
  storagePath: string;
  mediaType: MemoryMedia['mediaType'];
  mimeType: string;
  originalFileName: string;
  bytes: number;
  uploadStatus: 'pending';
  publicUrlAllowed: false;
  resumableRecommended: boolean;
}

const allowedByExtension: Record<string, string[]> = {
  mp4: ['video/mp4'],
  mov: ['video/quicktime'],
  webm: ['video/webm'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  mp3: ['audio/mpeg'],
  m4a: ['audio/mp4', 'audio/x-m4a'],
  wav: ['audio/wav', 'audio/x-wav'],
  aac: ['audio/aac', 'audio/mp4'],
  pdf: ['application/pdf'],
  txt: ['text/plain'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
};

const mediaByExtension: Record<string, MemoryMedia['mediaType']> = {
  mp4: 'video', mov: 'video', webm: 'video',
  jpg: 'photo', jpeg: 'photo', png: 'photo', webp: 'photo',
  mp3: 'audio', m4a: 'audio', wav: 'audio', aac: 'audio',
  pdf: 'document', txt: 'document', doc: 'document', docx: 'document'
};

export function fileExtension(fileName: string): string {
  const clean = fileName.toLowerCase().trim();
  const match = clean.match(/\.([a-z0-9]+)$/);
  return match?.[1] ?? '';
}

export function mediaTypeFromFile(file: Pick<File, 'type' | 'name'>): MemoryMedia['mediaType'] {
  const ext = fileExtension(file.name);
  return mediaByExtension[ext] ?? (file.type.startsWith('image/') ? 'photo' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document');
}

export function validateMemoryUpload(file: Pick<File, 'size' | 'type' | 'name'>): string[] {
  const errors: string[] = [];
  const maxBytes = 10 * 1024 * 1024 * 1024;
  const ext = fileExtension(file.name);
  const allowedMimeTypes = allowedByExtension[ext] ?? [];
  if (!file.name.trim()) errors.push('File must have a name.');
  if (file.name.includes('/') || file.name.includes('\\') || file.name.includes('..')) errors.push('File name cannot include path characters.');
  if (!ext || !allowedByExtension[ext]) errors.push('File type is not supported for family cloud storage.');
  if (file.size <= 0) errors.push('File is empty.');
  if (file.size > maxBytes) errors.push('File exceeds the 10 GB cloud upload safety limit.');
  if (!file.type) errors.push('File type could not be detected.');
  if (file.type && allowedMimeTypes.length && !allowedMimeTypes.includes(file.type)) errors.push('File extension and MIME type do not match an allowed media type.');
  return errors;
}

export function resumableRecommended(file: Pick<File, 'size' | 'type'>): boolean {
  const fiftyMb = 50 * 1024 * 1024;
  return file.size >= fiftyMb || file.type.startsWith('video/');
}

export function prepareMemoryUpload(familyId: string, memoryId: string, file: File, zone: UploadZone = 'memories', objectId = crypto.randomUUID()): PreparedUpload {
  const errors = validateMemoryUpload(file);
  if (errors.length) throw new Error(errors.join(' '));
  return {
    familyId,
    memoryId,
    storageBucket: 'family-media',
    storagePath: storagePathFor(familyId, memoryId, file.name, zone, objectId),
    mediaType: mediaTypeFromFile(file),
    mimeType: file.type,
    originalFileName: file.name,
    bytes: file.size,
    uploadStatus: 'pending',
    publicUrlAllowed: false,
    resumableRecommended: resumableRecommended(file)
  };
}
