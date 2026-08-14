import type { LegacyCustodianAuthorization, LegacyEventType, LegacyLock, LegacyProfile, MemorialMedia } from '../types/domain';

export type LegacyActorRole = 'owner' | 'family_member' | 'next_of_kin' | 'legacy_custodian' | 'family_manager' | 'administrator';

export interface LegacyActor {
  id: string;
  role: LegacyActorRole;
  personId?: string;
}

export interface OriginalStoryDraft {
  legacyProfileId: string;
  creatorId: string;
  familyId: string;
  personId: string;
  originalStory: string;
  originalVersion?: number;
  createdAt?: string;
  preservedAt?: string;
}

export function buildLegacyContentHash(input: Pick<OriginalStoryDraft, 'originalStory' | 'creatorId'> & { originalVersion: number }) {
  const payload = `${input.originalStory}|${input.creatorId}|${input.originalVersion}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < payload.length; index += 1) {
    hash ^= payload.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export function preserveOriginalStory(input: OriginalStoryDraft): LegacyLock {
  if (!input.originalStory.trim()) throw new Error('Original story cannot be empty.');
  const originalVersion = input.originalVersion ?? 1;
  const now = input.preservedAt ?? new Date().toISOString();
  return {
    id: `legacy-lock-${input.legacyProfileId}-${originalVersion}`,
    familyId: input.familyId,
    legacyProfileId: input.legacyProfileId,
    personId: input.personId,
    creatorId: input.creatorId,
    originalStory: input.originalStory,
    originalVersion,
    contentHash: buildLegacyContentHash({ originalStory: input.originalStory, creatorId: input.creatorId, originalVersion }),
    createdAt: input.createdAt ?? now,
    preservedAt: now,
    immutable: true
  };
}

export function canEditOriginalStory(profile: LegacyProfile, actor: LegacyActor, lock?: LegacyLock) {
  return profile.ownerUserId === actor.id && !profile.originalStoryPreserved && !lock;
}

export function assertCanMutateOriginalStory(profile: LegacyProfile, actor: LegacyActor, lock?: LegacyLock) {
  if (!canEditOriginalStory(profile, actor, lock)) {
    throw new Error('Original Story — Preserved cannot be edited, replaced, or deleted.');
  }
}

export function rejectPreservedOriginalMutation(action: 'edit' | 'replace' | 'delete', actor: LegacyActor): never {
  throw new Error(`${actor.role} cannot ${action} the Original Story — Preserved.`);
}

export function canRequestLegacyStatus(profile: LegacyProfile, actor: LegacyActor, custodians: LegacyCustodianAuthorization[]) {
  if (profile.accountState !== 'ACTIVE' && profile.accountState !== 'LEGACY_PENDING') return false;
  if (actor.role === 'family_manager') return true;
  return custodians.some(custodian => custodian.active && (custodian.custodianUserId === actor.id || custodian.custodianPersonId === actor.personId));
}

export function requestLegacyStatus(profile: LegacyProfile, actor: LegacyActor, custodians: LegacyCustodianAuthorization[]): LegacyProfile {
  if (!canRequestLegacyStatus(profile, actor, custodians)) {
    throw new Error('Legacy status request requires authorized next of kin, custodian, or family manager.');
  }
  return { ...profile, accountState: 'LEGACY_PENDING', legacyRequestedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function approveLegacyStatus(profile: LegacyProfile, actor: LegacyActor, lock?: LegacyLock): LegacyProfile {
  if (actor.role !== 'family_manager') throw new Error('Legacy status approval requires configured family authorization.');
  if (profile.accountState !== 'LEGACY_PENDING') throw new Error('Legacy status must be requested before approval.');
  if (!profile.originalStoryPreserved || !lock) throw new Error('Original Story — Preserved is required before Legacy Mode.');
  return { ...profile, accountState: 'LEGACY', legacyApprovedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

export function canAddMemorialMedia(profile: LegacyProfile, actor: LegacyActor, custodians: LegacyCustodianAuthorization[]) {
  if (profile.accountState !== 'LEGACY') return false;
  if (actor.role === 'family_manager') return true;
  return custodians.some(custodian => custodian.active && (custodian.custodianUserId === actor.id || custodian.custodianPersonId === actor.personId));
}

export function createMemorialMedia(input: Omit<MemorialMedia, 'id' | 'title' | 'createdAt' | 'contributors'> & { title?: string; contributors?: MemorialMedia['contributors']; createdAt?: string }, profile: LegacyProfile, actor: LegacyActor, custodians: LegacyCustodianAuthorization[]): MemorialMedia {
  if (!canAddMemorialMedia(profile, actor, custodians)) throw new Error('ADD FUNERAL / MEMORIAL VIDEO requires Legacy Mode and authorized Next of Kin or Legacy Custodian.');
  return {
    ...input,
    id: `memorial-${input.memoryId}`,
    title: input.title ?? 'Memorial Video',
    contributors: input.contributors ?? [],
    createdAt: input.createdAt ?? new Date().toISOString()
  };
}

export function memorialTimelineSections() {
  return [
    'LIFE STORY',
    'LIFE MEMORIES',
    'FUNERAL & MEMORIAL',
    'FAMILY MEMORIES AFTER PASSING'
  ] as const;
}

export function legacyAuditAction(action: LegacyEventType, actor: LegacyActor, target: string) {
  return {
    actor: actor.id,
    action,
    timestamp: new Date().toISOString(),
    target
  };
}

export const legacyGuidingPrinciple = 'Preserve what the person said. Let the family add what they remember. Never rewrite history.';
