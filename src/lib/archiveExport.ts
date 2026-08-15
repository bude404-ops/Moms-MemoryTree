import type { ArchiveDataState } from './archiveData';
import type { Memory, MemoryMedia, Person } from '../types/domain';

export interface ArchiveExportManifest {
  manifestVersion: 'memorytree-export-v1';
  exportedAt: string;
  source: ArchiveDataState['source'];
  family: {
    id: string;
    name: string;
    storagePlanId?: string;
  };
  counts: {
    people: number;
    memories: number;
    media: number;
    timelineEvents: number;
    familyMembers: number;
  };
  privacy: {
    privateMemories: number;
    familyMemories: number;
    specificPeopleMemories: number;
    descendantsMemories: number;
    legacyMemories: number;
  };
  media: {
    totalBytes: number;
    photoBytes: number;
    videoBytes: number;
    audioBytes: number;
    documentBytes: number;
    files: ArchiveExportMediaEntry[];
  };
  memories: ArchiveExportMemoryEntry[];
  warnings: string[];
}

export interface ArchiveExportMemoryEntry {
  id: string;
  title: string;
  type: Memory['type'];
  privacy: Memory['privacy'];
  associatedPerson?: string;
  category: string;
  dateText?: string;
  mediaCount: number;
  preservedOriginals: number;
}

export interface ArchiveExportMediaEntry {
  id: string;
  memoryId: string;
  mediaType: MemoryMedia['mediaType'];
  originalFileName?: string;
  bytes: number;
  uploadStatus: MemoryMedia['uploadStatus'];
  provider?: string;
  requiresSignedAccess: boolean;
}

const privacyKeys: Record<Memory['privacy'], keyof ArchiveExportManifest['privacy']> = {
  private: 'privateMemories',
  family: 'familyMemories',
  specific_people: 'specificPeopleMemories',
  descendants: 'descendantsMemories',
  legacy: 'legacyMemories'
};

function personName(people: Person[], personId?: string): string | undefined {
  if (!personId) return undefined;
  return people.find(person => person.id === personId)?.displayName;
}

export function createArchiveExportManifest(archive: ArchiveDataState, exportedAt = new Date().toISOString()): ArchiveExportManifest {
  const privacy = archive.memories.reduce<ArchiveExportManifest['privacy']>((acc, memory) => {
    acc[privacyKeys[memory.privacy]] += 1;
    return acc;
  }, { privateMemories: 0, familyMemories: 0, specificPeopleMemories: 0, descendantsMemories: 0, legacyMemories: 0 });

  const mediaByMemory = new Map<string, MemoryMedia[]>();
  for (const media of archive.media) {
    mediaByMemory.set(media.memoryId, [...(mediaByMemory.get(media.memoryId) ?? []), media]);
  }

  const mediaFiles = archive.media.map((media): ArchiveExportMediaEntry => ({
    id: media.id,
    memoryId: media.memoryId,
    mediaType: media.mediaType,
    originalFileName: media.originalFileName,
    bytes: media.bytes,
    uploadStatus: media.uploadStatus,
    provider: media.provider,
    requiresSignedAccess: true
  }));

  const warnings = [
    archive.source === 'demo' ? 'This manifest was generated from local demo data; it is not a verified cloud backup.' : '',
    archive.media.some(media => media.uploadStatus !== 'completed') ? 'Some media is not completed and should not be treated as fully preserved.' : '',
    archive.error ? `Archive data error was present during export: ${archive.error}` : ''
  ].filter(Boolean);

  return {
    manifestVersion: 'memorytree-export-v1',
    exportedAt,
    source: archive.source,
    family: {
      id: archive.family.id,
      name: archive.family.name,
      storagePlanId: archive.family.storagePlanId
    },
    counts: {
      people: archive.people.length,
      memories: archive.memories.length,
      media: archive.media.length,
      timelineEvents: archive.timeline.length,
      familyMembers: archive.members.length
    },
    privacy,
    media: {
      totalBytes: archive.media.reduce((sum, media) => sum + media.bytes, 0),
      photoBytes: archive.media.filter(media => media.mediaType === 'photo').reduce((sum, media) => sum + media.bytes, 0),
      videoBytes: archive.media.filter(media => media.mediaType === 'video').reduce((sum, media) => sum + media.bytes, 0),
      audioBytes: archive.media.filter(media => media.mediaType === 'audio').reduce((sum, media) => sum + media.bytes, 0),
      documentBytes: archive.media.filter(media => media.mediaType === 'document').reduce((sum, media) => sum + media.bytes, 0),
      files: mediaFiles
    },
    memories: archive.memories.map((memory): ArchiveExportMemoryEntry => {
      const media = mediaByMemory.get(memory.id) ?? [];
      return {
        id: memory.id,
        title: memory.title,
        type: memory.type,
        privacy: memory.privacy,
        associatedPerson: personName(archive.people, memory.associatedPersonId),
        category: memory.category,
        dateText: memory.dateText,
        mediaCount: media.length,
        preservedOriginals: media.filter(item => item.originalPreserved).length
      };
    }),
    warnings
  };
}

export function downloadArchiveExportManifest(archive: ArchiveDataState): ArchiveExportManifest {
  const manifest = createArchiveExportManifest(archive);
  const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `memorytree-${archive.family.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'family'}-manifest.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return manifest;
}
