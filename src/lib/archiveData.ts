import { useCallback, useEffect, useMemo, useState } from 'react';
import { bytesByType, loadArchive, saveArchive, type LocalArchiveState } from './archiveStore';
import { demoFamily, demoStorage, demoTimeline } from './demoData';
import { memoryTreeRepository, type CreateMemoryInput, type CreateRelationshipInput, type InviteFamilyMemberInput, type MemoryTreeRepository } from './repository';
import { supabase } from './supabase';
import { createSupabaseMediaStorageService, MediaStorageService } from './mediaStorage';
import { mediaTypeFromFile } from './mediaUpload';
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
    members: local.members,
    people: local.people,
    relationships: local.relationships,
    memories: local.memories,
    media: local.media,
    timeline: demoTimeline,
    custodians: local.custodians,
    storage: local.storage
  });
}

export function useArchiveData(context: ArchiveContextInput, repository: MemoryTreeRepository = memoryTreeRepository, storageService: MediaStorageService | null = supabase ? createSupabaseMediaStorageService(supabase) : null) {
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

  async function createMemory(input: Omit<Memory, 'id' | 'createdAt' | 'creatorId' | 'familyId' | 'tags' | 'legacyStatus'>, file?: File) {
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
      let uploadedMedia: MemoryMedia | null = null;
      if (file) {
        const quota = await (storageService ?? new MediaStorageService({ id: 'future-cloud', prepareUpload: () => { throw new Error('Storage provider unavailable.'); }, upload: async () => { throw new Error('Storage provider unavailable.'); } })).assertQuota(archive.storage, file.size);
        if (!quota.allowed) throw new Error(quota.reason ?? 'This upload exceeds the family storage quota.');
        uploadedMedia = await repository.uploadMemoryMedia({
          familyId: context.activeFamily.id,
          memoryId: created.id,
          uploaderId: context.userId,
          file,
          mediaType: mediaTypeFromFile(file)
        });
      }
      setLiveState(prev => prev ? buildArchiveState({ ...prev, memories: [created, ...prev.memories], media: uploadedMedia ? [uploadedMedia, ...prev.media] : prev.media }) : prev);
      await reload();
      return created;
    }
    if (file) {
      const quota = await (storageService ?? new MediaStorageService({ id: 'future-cloud', prepareUpload: () => { throw new Error('Storage provider unavailable.'); }, upload: async () => { throw new Error('Storage provider unavailable.'); } })).assertQuota(archive.storage, file.size);
      if (!quota.allowed) throw new Error(quota.reason ?? 'This upload exceeds the family storage quota.');
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
    const localMedia: MemoryMedia | null = file ? {
      id: `media-${crypto.randomUUID()}`,
      memoryId: memory.id,
      familyId: demoFamily.id,
      storageBucket: 'family-media',
      storagePath: `demo/private/${memory.id}/${crypto.randomUUID()}-original.${file.name.split('.').pop() ?? 'bin'}`,
      mediaType: mediaTypeFromFile(file),
      mimeType: file.type,
      originalFileName: file.name,
      bytes: file.size,
      uploadStatus: 'completed',
      provider: 'supabase',
      originalPreserved: true
    } : null;
    setLocalArchive(prev => ({ ...prev, memories: [memory, ...prev.memories], media: localMedia ? [localMedia, ...prev.media] : prev.media }));
    return memory;
  }

  async function addPerson(displayName: string) {
    if (context.mode === 'ready' && context.activeFamily) {
      const person = await repository.addPerson(context.activeFamily.id, displayName);
      setLiveState(prev => prev ? buildArchiveState({ ...prev, people: [...prev.people, person] }) : prev);
      await reload();
      return person;
    }
    const person: Person = { id: `person-${crypto.randomUUID()}`, familyId: demoFamily.id, displayName };
    setLocalArchive(prev => ({ ...prev, people: [...prev.people, person] }));
    return person;
  }

  async function createRelationship(input: Omit<CreateRelationshipInput, 'familyId'>) {
    if (context.mode === 'ready' && context.activeFamily) {
      const relationship = await repository.createRelationship({ ...input, familyId: context.activeFamily.id });
      setLiveState(prev => prev ? buildArchiveState({ ...prev, relationships: [...prev.relationships, relationship] }) : prev);
      await reload();
      return relationship;
    }
    const relationship: FamilyRelationship = { id: `relationship-${crypto.randomUUID()}`, familyId: demoFamily.id, ...input };
    setLocalArchive(prev => ({ ...prev, relationships: [...prev.relationships, relationship] }));
    return relationship;
  }

  async function inviteFamilyMember(input: Omit<InviteFamilyMemberInput, 'familyId'>) {
    if (context.mode === 'ready' && context.activeFamily) {
      const member = await repository.inviteFamilyMember({ ...input, familyId: context.activeFamily.id });
      setLiveState(prev => prev ? buildArchiveState({ ...prev, members: [...prev.members, member] }) : prev);
      await reload();
      return member;
    }
    const member: FamilyMember = {
      id: `member-${crypto.randomUUID()}`,
      familyId: demoFamily.id,
      personId: input.personId,
      role: input.role,
      relationshipLabel: input.relationshipLabel,
      status: 'invited',
      permissions: input.permissions ?? ['memory:create']
    };
    setLocalArchive(prev => ({ ...prev, members: [...prev.members, member] }));
    return member;
  }

  return { archive, createMemory, addPerson, createRelationship, inviteFamilyMember, reload };
}
