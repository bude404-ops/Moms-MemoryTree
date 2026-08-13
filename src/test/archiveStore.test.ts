import { describe, expect, it, vi } from 'vitest';
import { loadArchive, saveArchive } from '../lib/archiveStore';
import { demoPeople, demoRelationships } from '../lib/demoData';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    clear: vi.fn(() => storage.clear())
  },
  configurable: true
});

describe('local archive family management persistence', () => {
  it('loads default people and relationships for demo mode', () => {
    storage.clear();
    const archive = loadArchive();
    expect(archive.people.length).toBe(demoPeople.length);
    expect(archive.relationships.length).toBe(demoRelationships.length);
    expect(archive.members.length).toBeGreaterThan(0);
  });

  it('persists newly added people and invite-ready members', () => {
    storage.clear();
    const archive = loadArchive();
    const next = {
      ...archive,
      people: [...archive.people, { id: 'person-new', familyId: archive.storage.familyId, displayName: 'Aunt Lily' }],
      members: [...archive.members, { id: 'member-new', familyId: archive.storage.familyId, personId: 'person-new', role: 'contributor' as const, status: 'invited' as const, permissions: ['memory:create'] }]
    };
    saveArchive(next);
    const loaded = loadArchive();
    expect(loaded.people.some(person => person.displayName === 'Aunt Lily')).toBe(true);
    expect(loaded.members.some(member => member.personId === 'person-new' && member.status === 'invited')).toBe(true);
  });
});
