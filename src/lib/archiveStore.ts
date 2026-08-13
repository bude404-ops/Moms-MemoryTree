import { demoCustodians, demoMedia, demoMembers, demoMemories, demoPeople, demoRelationships, demoStorage } from './demoData';
import type { FamilyMember, FamilyRelationship, LegacyCustodian, Memory, MemoryMedia, Person, StorageUsage } from '../types/domain';

const STORAGE_KEY = 'moms-memorytree-phase1';

export interface LocalArchiveState {
  memories: Memory[];
  media: MemoryMedia[];
  storage: StorageUsage;
  people: Person[];
  relationships: FamilyRelationship[];
  members: FamilyMember[];
  custodians: LegacyCustodian[];
}

const defaultArchive: LocalArchiveState = {
  memories: demoMemories,
  media: demoMedia,
  storage: demoStorage,
  people: demoPeople,
  relationships: demoRelationships,
  members: demoMembers,
  custodians: demoCustodians
};

export function loadArchive(): LocalArchiveState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultArchive, ...JSON.parse(raw) } as LocalArchiveState;
  } catch {
    // If local state is corrupted, fall back to seed data instead of blocking the family archive view.
  }
  return defaultArchive;
}

export function saveArchive(state: LocalArchiveState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function bytesByType(media: MemoryMedia[]) {
  return media.reduce(
    (acc, item) => {
      if (item.mediaType === 'video') acc.videosBytes += item.bytes;
      if (item.mediaType === 'photo') acc.photosBytes += item.bytes;
      if (item.mediaType === 'audio') acc.audioBytes += item.bytes;
      if (item.mediaType === 'document') acc.documentsBytes += item.bytes;
      return acc;
    },
    { videosBytes: 0, photosBytes: 0, audioBytes: 0, documentsBytes: 0 }
  );
}

export function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
