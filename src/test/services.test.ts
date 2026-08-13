import { describe, expect, it, vi } from 'vitest';
import { mediaTypeFromFile, prepareMemoryUpload, validateMemoryUpload } from '../lib/mediaUpload';
import { getRuntimeReadiness } from '../lib/readiness';
import { MemoryTreeRepository } from '../lib/repository';

describe('media upload preparation', () => {
  it('classifies media types from mime type', () => {
    expect(mediaTypeFromFile({ type: 'image/jpeg', name: 'mom.jpg' })).toBe('photo');
    expect(mediaTypeFromFile({ type: 'video/mp4', name: 'story.mp4' })).toBe('video');
    expect(mediaTypeFromFile({ type: 'audio/mpeg', name: 'voice.mp3' })).toBe('audio');
    expect(mediaTypeFromFile({ type: 'application/pdf', name: 'letter.pdf' })).toBe('document');
  });

  it('rejects empty, nameless, unknown uploads', () => {
    expect(validateMemoryUpload({ name: '', size: 0, type: '' })).toEqual([
      'File must have a name.',
      'File is empty.',
      'File type could not be detected.'
    ]);
  });

  it('prepares private upload metadata without public URL access', () => {
    const file = new File(['hello'], 'Mom Story.mp4', { type: 'video/mp4' });
    const upload = prepareMemoryUpload('family-1', 'memory-1', file, 'legacy');
    expect(upload.publicUrlAllowed).toBe(false);
    expect(upload.storagePath).toMatch(/^family\/family-1\/legacy\/memory-1\/\d+-mom-story.mp4$/);
    expect(upload.mediaType).toBe('video');
    expect(upload.bytes).toBe(5);
  });
});

describe('runtime readiness', () => {
  it('does not claim backup or edge function readiness in phase 1', () => {
    const readiness = getRuntimeReadiness();
    expect(readiness.find(item => item.id === 'backup-provider')?.ready).toBe(false);
    expect(readiness.find(item => item.id === 'edge-functions')?.ready).toBe(false);
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
    const fakeClient = {
      functions: { invoke }
    };
    const repo = new MemoryTreeRepository(fakeClient as never);
    const access = await repo.createTemporaryMediaAccess('media-row-1');
    expect(invoke).toHaveBeenCalledWith('signed-media-access', { body: { mediaId: 'media-row-1' } });
    expect(access.publicUrlAllowed).toBe(false);
    expect(access.signedUrl).toBe('signed://temporary');
    expect(access.expiresInSeconds).toBe(300);
  });
});
