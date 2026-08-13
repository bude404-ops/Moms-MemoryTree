import type { FamilyMember, LegacyPermissionRule, Memory, MemoryMedia, PrivacyLevel } from '../types/domain';

export interface ViewerContext {
  userId?: string;
  familyId?: string;
  personId?: string;
  member?: FamilyMember;
  descendantPersonIds?: string[];
}

export function canViewMemory(memory: Memory, viewer: ViewerContext, allowedSpecificPeople: string[] = []): boolean {
  if (memory.softDeletedAt) return false;
  if (memory.creatorId === viewer.userId) return true;
  if (!viewer.member || viewer.member.familyId !== memory.familyId || viewer.member.status !== 'active') return false;

  switch (memory.privacy satisfies PrivacyLevel) {
    case 'private':
      return false;
    case 'family':
      return viewer.member.permissions.includes('memory:view_family') || viewer.member.role === 'owner' || viewer.member.role === 'manager' || viewer.member.role === 'legacy_custodian';
    case 'specific_people':
      return Boolean(viewer.personId && allowedSpecificPeople.includes(viewer.personId));
    case 'descendants':
      return Boolean(memory.associatedPersonId && viewer.descendantPersonIds?.includes(viewer.personId ?? ''));
    case 'legacy':
      return memory.legacyStatus === 'archived' && (viewer.member.role === 'legacy_custodian' || viewer.member.permissions.includes('legacy:view_released'));
    default:
      return false;
  }
}

export function canAccessMedia(memory: Memory, media: MemoryMedia, viewer: ViewerContext, allowedSpecificPeople: string[] = []): boolean {
  if (media.familyId !== memory.familyId || media.memoryId !== memory.id) return false;
  return canViewMemory(memory, viewer, allowedSpecificPeople);
}

export function storagePathFor(familyId: string, memoryId: string, fileName: string, zone: 'memories' | 'people' | 'timeline' | 'legacy' = 'memories', objectId = crypto.randomUUID()): string {
  const extension = fileName.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? 'bin';
  const safeObjectId = objectId.toLowerCase().replace(/[^a-f0-9-]/g, '');
  if (!safeObjectId || safeObjectId.includes('..')) throw new Error('Invalid storage object id.');
  return `family/${familyId}/${zone}/${memoryId}/${safeObjectId}-original.${extension}`;
}

export function signedUrlPolicy(storagePath: string, expiresInSeconds = 300) {
  return {
    storagePath,
    expiresInSeconds,
    expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    publicUrlAllowed: false
  };
}

export function isSignedUrlExpired(expiresAt: string, now = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

export function legacyRuleAllowsAccess(rule: LegacyPermissionRule, legacyModeActive: boolean, viewer: ViewerContext, specificPersonId?: string): boolean {
  if (rule === 'private_forever') return false;
  if (!legacyModeActive) return false;
  if (rule === 'family_after_legacy') return Boolean(viewer.member?.status === 'active');
  if (rule === 'descendants_after_legacy') return Boolean(viewer.personId && viewer.descendantPersonIds?.includes(viewer.personId));
  if (rule === 'custodian_only') return viewer.member?.role === 'legacy_custodian';
  if (rule === 'specific_person') return Boolean(viewer.personId && viewer.personId === specificPersonId);
  return false;
}
