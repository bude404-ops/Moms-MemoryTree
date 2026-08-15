import { describe, expect, it, vi } from 'vitest';
import { mediaTypeFromFile, prepareMemoryUpload, validateMemoryUpload } from '../lib/mediaUpload';
import { MediaStorageService, SupabaseStorageProvider, UnavailableStorageProvider, type UploadProgressEvent } from '../lib/mediaStorage';
import { getRuntimeReadiness } from '../lib/readiness';
import { MemoryTreeRepository } from '../lib/repository';

describe('media upload preparation', () => {
  it('classifies media types from mime type and extension', () => {
    expect(mediaTypeFromFile({ type: 'image/jpeg', name: 'mom.jpg' })).toBe('photo');
    expect(mediaTypeFromFile({ type: 'video/mp4', name: 'story.mp4' })).toBe('video');
    expect(mediaTypeFromFile({ type: 'audio/mpeg', name: 'voice.mp3' })).toBe('audio');
    expect(mediaTypeFromFile({ type: 'application/pdf', name: 'letter.pdf' })).toBe('document');
  });

  it('rejects empty, nameless, unsupported, and mismatched uploads', () => {
    expect(validateMemoryUpload({ name: '', size: 0, type: '' })).toEqual(expect.arrayContaining([
      'File must have a name.',
      'File is empty.',
      'File type could not be detected.'
    ]));
    expect(validateMemoryUpload({ name: '../secret.exe', size: 10, type: 'application/octet-stream' })).toEqual(expect.arrayContaining([
      'File name cannot include path characters.',
      'File type is not supported for family cloud storage.'
    ]));
    expect(validateMemoryUpload({ name: 'story.mp4', size: 10, type: 'image/png' })).toContain('File extension and MIME type do not match an allowed media type.');
  });

  it('prepares private UUID-based upload metadata without public URL access', () => {
    const file = new File(['hello'], 'Mom Story.mp4', { type: 'video/mp4' });
    const upload = prepareMemoryUpload('family-1', 'memory-1', file, 'legacy', '11111111-1111-4111-8111-111111111111');
    expect(upload.publicUrlAllowed).toBe(false);
    expect(upload.storageBucket).toBe('family-media');
    expect(upload.storagePath).toBe('family/family-1/legacy/memory-1/11111111-1111-4111-8111-111111111111-original.mp4');
    expect(upload.mediaType).toBe('video');
    expect(upload.uploadStatus).toBe('pending');
    expect(upload.resumableRecommended).toBe(true);
  });
});

describe('runtime readiness', () => {
  it('does not claim backup or edge function readiness in phase 1', () => {
    const readiness = getRuntimeReadiness();
    expect(readiness.find(item => item.id === 'backup-provider')?.ready).toBe(false);
    expect(readiness.find(item => item.id === 'edge-functions')?.ready).toBe(false);
  });
});

describe('storage quotas', () => {
  it('rejects uploads that exceed remaining family storage', async () => {
    const service = new MediaStorageService(new UnavailableStorageProvider());
    const result = await service.assertQuota({ familyId: 'family-1', videosBytes: 90, photosBytes: 5, audioBytes: 0, documentsBytes: 0, limitBytes: 100 }, 10);
    expect(result.allowed).toBe(false);
    expect(result.remainingBytes).toBe(5);
  });
});


describe('Supabase media storage provider', () => {
  it('emits progress and completed events without public URLs', async () => {
    const events: string[] = [];
    const upload = vi.fn().mockResolvedValue({ data: { path: 'stored' }, error: null });
    const provider = new SupabaseStorageProvider({ storage: { from: vi.fn().mockReturnValue({ upload }) } } as never);
    const result = await provider.upload({
      familyId: 'family-1',
      memoryId: 'memory-1',
      file: new File(['hello'], 'story.mp4', { type: 'video/mp4' }),
      onProgress: (event: UploadProgressEvent) => events.push(`${event.status}:${event.progress}`)
    } as never);
    expect(result.uploadStatus).toBe('completed');
    expect(result.publicUrlAllowed).toBe(false);
    expect(events.some(event => event.startsWith('uploading:1'))).toBe(true);
    expect(events.some(event => event.startsWith('processing:95'))).toBe(true);
    expect(events.some(event => event.startsWith('completed:100'))).toBe(true);
  });

  it('cancels before storage upload starts when aborted', async () => {
    const upload = vi.fn();
    const controller = new AbortController();
    controller.abort();
    const provider = new SupabaseStorageProvider({ storage: { from: vi.fn().mockReturnValue({ upload }) } } as never);
    await expect(provider.upload({ familyId: 'family-1', memoryId: 'memory-1', file: new File(['hello'], 'story.mp4', { type: 'video/mp4' }), signal: controller.signal })).rejects.toThrow('Upload cancelled');
    expect(upload).not.toHaveBeenCalled();
  });
});

describe('repository service layer', () => {
  it('falls back to demo families when Supabase is not configured', async () => {
    const repo = new MemoryTreeRepository(null);
    await expect(repo.listFamilies()).resolves.toHaveLength(1);
    await expect(repo.getAuthState()).resolves.toEqual({ configured: false, user: null });
  });

  it('requests expiring signed URLs through the signed-media Edge Function', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { signedUrl: 'signed://temporary', expiresInSeconds: 300 }, error: null });
    const repo = new MemoryTreeRepository({ functions: { invoke } } as never);
    const access = await repo.createTemporaryMediaAccess('media-row-1');
    expect(invoke).toHaveBeenCalledWith('signed-media-access', { body: { mediaId: 'media-row-1' } });
    expect(access.publicUrlAllowed).toBe(false);
    expect(access.signedUrl).toBe('signed://temporary');
    expect(access.expiresInSeconds).toBe(300);
  });

  it('creates secure family invitations with one-time plaintext token and stored hash only', async () => {
    const insert = vi.fn().mockImplementation((row) => ({
      select: () => ({ single: () => Promise.resolve({ data: { id: 'invite-1', ...row, created_at: '2026-08-15T00:00:00Z' }, error: null }) })
    }));
    const repo = new MemoryTreeRepository({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1', email: 'mom@example.com', user_metadata: {} } }, error: null }) },
      from: vi.fn().mockReturnValue({ insert })
    } as never);
    const invite = await repo.createFamilyInvitation({ familyId: 'family-1', email: 'KIN@EXAMPLE.COM', role: 'member', relationshipLabel: 'Daughter', expiresInDays: 1 });
    expect(invite.token).toMatch(/^[a-f0-9]{48}$/);
    expect(invite.acceptUrl).toContain(encodeURIComponent(invite.token));
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      family_id: 'family-1',
      email: 'kin@example.com',
      role: 'member',
      relationship_label: 'Daughter',
      invited_by: 'user-1',
      status: 'pending'
    }));
    expect(insert.mock.calls[0][0].token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(insert.mock.calls[0][0].token_hash).not.toBe(invite.token);
  });
});

describe('repository media preservation chain', () => {
  it('uploads private storage object before writing completed media metadata', async () => {
    const calls: string[] = [];
    const upload = vi.fn().mockImplementation(() => { calls.push('storage'); return Promise.resolve({ data: { path: 'stored' }, error: null }); });
    const insert = vi.fn().mockImplementation((row) => { calls.push('metadata'); return { select: () => ({ single: () => Promise.resolve({ data: { id: 'media-1', memory_id: 'memory-1', family_id: 'family-1', storage_bucket: 'family-media', storage_path: row.storage_path, media_type: 'document', file_size: 5, upload_status: 'completed', original_file_name: 'file.txt', original_preserved: true }, error: null }) }) }; });
    const repo = new MemoryTreeRepository({ storage: { from: vi.fn().mockReturnValue({ upload }) }, from: vi.fn().mockReturnValue({ insert }) } as never);
    const media = await repo.uploadMemoryMedia({ familyId: 'family-1', memoryId: 'memory-1', uploaderId: 'user-1', file: new File(['hello'], 'file.txt', { type: 'text/plain' }), mediaType: 'document' });
    expect(calls).toEqual(['storage', 'metadata']);
    expect(media.uploadStatus).toBe('completed');
    expect(media.storageBucket).toBe('family-media');
    expect(media.originalPreserved).toBe(true);
    expect(upload).toHaveBeenCalledWith(expect.stringMatching(/^family\/family-1\/memories\/memory-1\/[a-f0-9-]+-original.txt$/), expect.any(File), { contentType: 'text/plain', upsert: false });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ upload_status: 'completed', original_file_name: 'file.txt', original_preserved: true }));
  });

  it('does not write media metadata when storage upload fails', async () => {
    const upload = vi.fn().mockResolvedValue({ data: null, error: new Error('storage denied') });
    const insert = vi.fn();
    const repo = new MemoryTreeRepository({ storage: { from: vi.fn().mockReturnValue({ upload }) }, from: vi.fn().mockReturnValue({ insert }) } as never);
    await expect(repo.uploadMemoryMedia({ familyId: 'family-1', memoryId: 'memory-1', uploaderId: 'user-1', file: new File(['hello'], 'file.txt', { type: 'text/plain' }), mediaType: 'document' })).rejects.toThrow('storage denied');
    expect(insert).not.toHaveBeenCalled();
  });
});
