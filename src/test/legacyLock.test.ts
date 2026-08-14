import { describe, expect, it } from 'vitest';
import type { LegacyCustodianAuthorization, LegacyProfile } from '../types/domain';
import { approveLegacyStatus, canEditOriginalStory, createMemorialMedia, legacyGuidingPrinciple, memorialTimelineSections, preserveOriginalStory, rejectPreservedOriginalMutation, requestLegacyStatus } from '../lib/legacyLock';

const profile: LegacyProfile = {
  id: 'legacy-robert',
  familyId: 'family-willow',
  personId: 'person-robert',
  ownerUserId: 'user-robert',
  accountState: 'ACTIVE',
  originalStoryCurrentDraft: 'I was born near the river.',
  originalStoryPreserved: false,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z'
};

const custodian: LegacyCustodianAuthorization = {
  id: 'kin-sarah',
  familyId: 'family-willow',
  legacyProfileId: 'legacy-robert',
  ownerUserId: 'user-robert',
  custodianUserId: 'user-sarah',
  custodianPersonId: 'person-sarah',
  role: 'PRIMARY_NEXT_OF_KIN',
  relationshipLabel: 'Robert\'s daughter',
  authorizationScope: ['legacy:request', 'memorial:create'],
  active: true
};

const owner = { id: 'user-robert', role: 'owner' as const, personId: 'person-robert' };
const familyMember = { id: 'user-family', role: 'family_member' as const, personId: 'person-family' };
const nextOfKin = { id: 'user-sarah', role: 'next_of_kin' as const, personId: 'person-sarah' };
const legacyCustodian = { id: 'user-sarah', role: 'legacy_custodian' as const, personId: 'person-sarah' };
const familyManager = { id: 'user-manager', role: 'family_manager' as const, personId: 'person-manager' };
const administrator = { id: 'user-admin', role: 'administrator' as const };

describe('Legacy Memory Lock system', () => {
  it('lets the owner edit draft before preservation', () => {
    expect(canEditOriginalStory(profile, owner)).toBe(true);
  });

  it('creates an immutable preserved original story record with creator and hash', () => {
    const lock = preserveOriginalStory({ legacyProfileId: profile.id, creatorId: profile.ownerUserId, familyId: profile.familyId, personId: profile.personId, originalStory: profile.originalStoryCurrentDraft! });
    expect(lock.creatorId).toBe('user-robert');
    expect(lock.originalStory).toBe('I was born near the river.');
    expect(lock.originalVersion).toBe(1);
    expect(lock.contentHash).toMatch(/^fnv1a-/);
    expect(lock.immutable).toBe(true);
  });

  it('blocks family member from editing or deleting preserved original story', () => {
    expect(() => rejectPreservedOriginalMutation('edit', familyMember)).toThrow('family_member cannot edit');
    expect(() => rejectPreservedOriginalMutation('delete', familyMember)).toThrow('family_member cannot delete');
  });

  it('blocks next of kin from editing preserved original story', () => {
    expect(() => rejectPreservedOriginalMutation('edit', nextOfKin)).toThrow('next_of_kin cannot edit');
  });

  it('blocks legacy custodian from editing preserved original story', () => {
    expect(() => rejectPreservedOriginalMutation('replace', legacyCustodian)).toThrow('legacy_custodian cannot replace');
  });

  it('blocks administrator from silently modifying preserved original story', () => {
    expect(() => rejectPreservedOriginalMutation('edit', administrator)).toThrow('administrator cannot edit');
  });

  it('requires authorized people to request Legacy status and manager approval to activate', () => {
    const pending = requestLegacyStatus({ ...profile, originalStoryPreserved: true }, nextOfKin, [custodian]);
    const lock = preserveOriginalStory({ legacyProfileId: profile.id, creatorId: profile.ownerUserId, familyId: profile.familyId, personId: profile.personId, originalStory: 'Original life story.' });
    const legacy = approveLegacyStatus(pending, familyManager, lock);
    expect(pending.accountState).toBe('LEGACY_PENDING');
    expect(legacy.accountState).toBe('LEGACY');
  });

  it('keeps memorial media as a new memory after Legacy Mode', () => {
    const legacy = { ...profile, accountState: 'LEGACY' as const, originalStoryPreserved: true };
    const memorial = createMemorialMedia({ familyId: profile.familyId, legacyProfileId: profile.id, personId: profile.personId, memoryId: 'memory-funeral-video', creatorId: nextOfKin.id, mediaId: 'media-funeral-video', description: 'Celebration of life', memorialDate: '2026-08-14', location: 'Family church' }, legacy, nextOfKin, [custodian]);
    expect(memorial.title).toBe('Memorial Video');
    expect(memorial.memoryId).toBe('memory-funeral-video');
    expect(memorial.creatorId).toBe('user-sarah');
  });

  it('defines the required memorial timeline sections and guiding principle', () => {
    expect(memorialTimelineSections()).toEqual(['LIFE STORY', 'LIFE MEMORIES', 'FUNERAL & MEMORIAL', 'FAMILY MEMORIES AFTER PASSING']);
    expect(legacyGuidingPrinciple).toContain('Never rewrite history');
  });
});
