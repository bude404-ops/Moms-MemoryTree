import { useCallback, useEffect, useMemo, useState } from 'react';
import { bytesByType, loadArchive, saveArchive, type LocalArchiveState } from './archiveStore';
import { demoCustodians, demoFamily, demoMembers, demoPeople, demoRelationships, demoStorage, demoTimeline } from './demoData';
import { memoryTreeRepository, type CreateMemoryInput, type MemoryTreeRepository } from './repository';
import type { Family, FamilyMember, FamilyRelationship, LegacyCustodian, LifeEvent, Memory, MemoryMedia, Person, StorageUsage } from '../types/domain';

export interface ArchiveDataState {
  source: 'demo' | 'supabase';
  loading: boolean;
  error: string | null;
  family: Family;
  members: FamilyMember[];
  people: Person[];
  relationships: FamilyRelationship[];
  memories: Memory[];
  media: MemoryMedia[];
  timeline: LifeEvent[];
  custodians: LegacyCustodian[];
  storage: StorageUsage;
}

export interface ArchiveContextInput {
  mode: 'demo' | 'signed_out' | 'needs_family' | 'ready';
  activeFamily: Family | null;
  userId?: string;
}

export function buildArchiveState(input: Omit<ArchiveDataState, 'loading' | 'error'> & Partial<Pick<ArchiveDataState, 'loading' | 'error'>>): ArchiveDataState {
  const mediaBytes = bytesByType(input.media);
  return {
    ...input,
    loading: input.loading ?? false,
    error: input.error ?? null,
    storage: { ...input.storage, ...mediaBytes }
  };
}

export function demoArchiveState(local: LocalArchiveState = loadArchive()): ArchiveDataState {
  return buildArchiveState({
    source: 'demo',
    family: demoFamily,
    members: demoMembers,
    people: demoPeople,
    relationships: demoRelationships,
    memories: local.memories,
    media: local.media,
    timeline: demoTimeline,
    custodians: demoCustodians,
    storage: local.storage
  });
}

export function useArchiveData(context: ArchiveContextInput, repository: MemoryTreeRepository = memoryTreeRepository) {
  const [localArchive, setLocalArchive] = useState<LocalArchiveState>(() => loadArchive());
  const [liveState, setLiveState] = useState<ArchiveDataState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => saveArchive(localArchive), [localArchive]);

  const reload = useCallback(async () => {
    if (context.mode !== 'ready' || !context.activeFamily) {
      setLiveState(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [members, people, relationships, memories, media, timeline, custodians, storage] = await Promise.all([
        repository.listFamilyMembers(context.activeFamily.id),
        repository.listPeople(context.activeFamily.id),
        repository.listRelationships(context.activeFamily.id),
        repository.listMemories(context.activeFamily.id),
        repository.listMemoryMedia(context.activeFamily.id),
        repository.listTimeline(context.activeFamily.id),
        repository.listLegacyCustodians(context.activeFamily.id),
        repository.getStorageUsage(context.activeFamily.id)
      ]);
      setLiveState(buildArchiveState({ source: 'supabase', family: context.activeFamily, members, people, relationships, memories, media, timeline, custodians, storage }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load family archive data.');
    } finally {
      setLoading(false);
    }
  }, [context.activeFamily, context.mode, repository]);

  useEffect(() => { void reload(); }, [reload]);

  const archive = useMemo(() => {
    if (context.mode === 'ready' && liveState) return { ...liveState, loading, error };
    if (context.mode === 'ready' && context.activeFamily) {
      return buildArchiveState({ source: 'supabase', family: context.activeFamily, members: [], people: [], relationships: [], memories: [], media: [], timeline: [], custodians: [], storage: { ...demoStorage, familyId: context.activeFamily.id, limitBytes: context.activeFamily.storageLimitBytes || demoStorage.limitBytes }, loading, error });
    }
    return { ...demoArchiveState(localArchive), loading, error };
  }, [context.activeFamily, context.mode, error, liveState, loading, localArchive]);

  async function createMemory(input: Omit<Memory, 'id' | 'createdAt' | 'creatorId' | 'familyId' | 'tags' | 'legacyStatus'>) {
    if (context.mode === 'ready' && context.activeFamily && context.userId) {
      const created = await repository.createMemory({
        familyId: context.activeFamily.id,
        creatorId: context.userId,
        title: input.title,
        description: input.description,
        memoryType: input.type,
        privacy: input.privacy,
        category: input.category,
        associatedPersonId: input.associatedPersonId,
        approximateDate: input.dateText,
        locationText: input.locationText
      } satisfies CreateMemoryInput);
      setLiveState(prev => prev ? buildArchiveState({ ...prev, memories: [created, ...prev.memories] }) : prev);
      await reload();
      return created;
    }
    const memory: Memory = {
      ...input,
      id: `memory-${crypto.randomUUID()}`,
      familyId: demoFamily.id,
      creatorId: 'demo-user-mom',
      tags: input.category ? [input.category.toLowerCase().replace(/\s+/g, '-')] : [],
      legacyStatus: input.privacy === 'legacy' ? 'legacy_ready' : 'active',
      createdAt: new Date().toISOString()
    };
    setLocalArchive(prev => ({ ...prev, memories: [memory, ...prev.memories] }));
    return memory;
  }

  return { archive, createMemory, reload };
}
