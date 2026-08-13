import { describe, expect, it } from 'vitest';

interface UserFixture { id: string; familyId: string; personId: string; role: 'owner' | 'manager' | 'member' | 'contributor' | 'legacy_custodian' }
interface MemoryFixture { id: string; familyId: string; creatorId: string; personId: string; privacy: 'private' | 'family' | 'specific_people' | 'descendants' | 'legacy'; explicitUserIds?: string[] }
interface MediaFixture { id: string; familyId: string; memoryId: string; storagePath: string }

const familyA = 'family-a';
const familyB = 'family-b';
const ownerA: UserFixture = { id: 'user-a-owner', familyId: familyA, personId: 'person-a-owner', role: 'owner' };
const memberA: UserFixture = { id: 'user-a-member', familyId: familyA, personId: 'person-a-member', role: 'member' };
const ownerB: UserFixture = { id: 'user-b-owner', familyId: familyB, personId: 'person-b-owner', role: 'owner' };

function canReadMemory(user: UserFixture, memory: MemoryFixture): boolean {
  if (user.familyId !== memory.familyId) return false;
  if (memory.creatorId === user.id) return true;
  if (memory.privacy === 'family') return true;
  if (memory.privacy === 'specific_people') return memory.explicitUserIds?.includes(user.id) ?? false;
  return false;
}

function canUploadMedia(user: UserFixture, media: MediaFixture): boolean {
  return user.familyId === media.familyId && media.storagePath.startsWith(`family/${user.familyId}/memories/${media.memoryId}/`);
}

describe('family isolation denial fixtures', () => {
  const privateMemoryA: MemoryFixture = { id: 'memory-a-private', familyId: familyA, creatorId: ownerA.id, personId: ownerA.personId, privacy: 'private' };
  const familyMemoryA: MemoryFixture = { id: 'memory-a-family', familyId: familyA, creatorId: ownerA.id, personId: ownerA.personId, privacy: 'family' };
  const restrictedMemoryA: MemoryFixture = { id: 'memory-a-specific', familyId: familyA, creatorId: ownerA.id, personId: ownerA.personId, privacy: 'specific_people', explicitUserIds: [ownerA.id] };

  it('Family A data is not readable by Family B', () => {
    expect(canReadMemory(ownerB, familyMemoryA)).toBe(false);
  });

  it('User A private memories are not readable by other family members', () => {
    expect(canReadMemory(memberA, privateMemoryA)).toBe(false);
  });

  it('restricted memories require explicit grants', () => {
    expect(canReadMemory(memberA, restrictedMemoryA)).toBe(false);
    expect(canReadMemory(ownerA, restrictedMemoryA)).toBe(true);
  });

  it('users cannot upload into another family storage path', () => {
    expect(canUploadMedia(ownerB, { id: 'media-a', familyId: familyA, memoryId: familyMemoryA.id, storagePath: `family/${familyA}/memories/${familyMemoryA.id}/clip.mp4` })).toBe(false);
  });

  it('malformed storage paths are denied even for same-family users', () => {
    expect(canUploadMedia(ownerA, { id: 'media-bad', familyId: familyA, memoryId: familyMemoryA.id, storagePath: `family/${familyB}/memories/${familyMemoryA.id}/clip.mp4` })).toBe(false);
  });
});
