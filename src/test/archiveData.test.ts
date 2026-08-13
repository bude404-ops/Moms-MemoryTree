import { describe, expect, it } from 'vitest';
import { buildArchiveState, demoArchiveState } from '../lib/archiveData';
import { demoFamily, demoStorage } from '../lib/demoData';
import type { MemoryMedia } from '../types/domain';

describe('archive data state', () => {
  it('builds demo archive state from local archive data', () => {
    const archive = demoArchiveState();
    expect(archive.source).toBe('demo');
    expect(archive.family.name).toBe(demoFamily.name);
    expect(archive.people.length).toBeGreaterThan(0);
    expect(archive.members.length).toBeGreaterThan(0);
    expect(archive.relationships.length).toBeGreaterThan(0);
  });

  it('normalizes storage usage from actual media bytes', () => {
    const media: MemoryMedia[] = [
      { id: 'm1', familyId: 'family-1', memoryId: 'memory-1', storageBucket: 'family-media', storagePath: 'a', mediaType: 'video', bytes: 100, uploadStatus: 'completed' },
      { id: 'm2', familyId: 'family-1', memoryId: 'memory-1', storageBucket: 'family-media', storagePath: 'b', mediaType: 'photo', bytes: 25, uploadStatus: 'completed' },
      { id: 'm3', familyId: 'family-1', memoryId: 'memory-2', storageBucket: 'family-media', storagePath: 'c', mediaType: 'audio', bytes: 10, uploadStatus: 'completed' },
      { id: 'm4', familyId: 'family-1', memoryId: 'memory-3', storageBucket: 'family-media', storagePath: 'd', mediaType: 'document', bytes: 5, uploadStatus: 'completed' }
    ];
    const state = buildArchiveState({ source: 'supabase', family: demoFamily, members: [], people: [], relationships: [], memories: [], media, timeline: [], custodians: [], storage: { ...demoStorage, videosBytes: 0, photosBytes: 0, audioBytes: 0, documentsBytes: 0 } });
    expect(state.storage.videosBytes).toBe(100);
    expect(state.storage.photosBytes).toBe(25);
    expect(state.storage.audioBytes).toBe(10);
    expect(state.storage.documentsBytes).toBe(5);
  });

  it('preserves loading and error states for live archive fetches', () => {
    const state = buildArchiveState({ source: 'supabase', family: demoFamily, members: [], people: [], relationships: [], memories: [], media: [], timeline: [], custodians: [], storage: demoStorage, loading: true, error: 'network blocked' });
    expect(state.loading).toBe(true);
    expect(state.error).toBe('network blocked');
  });
});
