import { describe, expect, it } from 'vitest';
import { canAccessMedia, canViewMemory, isSignedUrlExpired, legacyRuleAllowsAccess, signedUrlPolicy, storagePathFor } from '../lib/security';
import { demoMedia, demoMembers, demoMemories } from '../lib/demoData';

const creator = { userId: 'user-demo-mom', familyId: 'family-willow', personId: 'person-mom', member: demoMembers[0] };
const daughter = { userId: 'user-daughter', familyId: 'family-willow', personId: 'person-daughter', member: demoMembers[1] };
const otherFamily = { userId: 'user-other', familyId: 'family-other', personId: 'person-other', member: { ...demoMembers[2], familyId: 'family-other' } };

describe('memory privacy rules', () => {
  it('allows creator to view private memory', () => {
    const privateMemory = demoMemories.find(m => m.privacy === 'private')!;
    expect(canViewMemory(privateMemory, creator)).toBe(true);
  });

  it('blocks family member from creator private memory', () => {
    const privateMemory = demoMemories.find(m => m.privacy === 'private')!;
    expect(canViewMemory(privateMemory, daughter)).toBe(false);
  });

  it('blocks another family from family memory', () => {
    const familyMemory = demoMemories.find(m => m.privacy === 'family')!;
    expect(canViewMemory(familyMemory, otherFamily)).toBe(false);
  });

  it('blocks legacy memory before archived legacy state', () => {
    const legacyMemory = demoMemories.find(m => m.privacy === 'legacy')!;
    expect(canViewMemory(legacyMemory, daughter)).toBe(false);
  });

  it('uses memory authorization for media access', () => {
    const memory = demoMemories[0];
    const media = demoMedia.find(m => m.memoryId === memory.id)!;
    expect(canAccessMedia(memory, media, daughter)).toBe(true);
    expect(canAccessMedia(memory, media, otherFamily)).toBe(false);
  });
});

describe('storage signed URL architecture', () => {
  it('creates private storage paths scoped by family and memory', () => {
    expect(storagePathFor('family-1', 'memory-1', 'Mom Video!.mp4', 'memories', '11111111-1111-4111-8111-111111111111')).toBe('family/family-1/memories/memory-1/11111111-1111-4111-8111-111111111111-original.mp4');
  });

  it('creates expiring signed URL policies', () => {
    const policy = signedUrlPolicy('family/family-1/memories/memory-1/video.mp4', 60);
    expect(policy.publicUrlAllowed).toBe(false);
    expect(isSignedUrlExpired(policy.expiresAt, new Date(Date.now() + 61_000))).toBe(true);
  });
});

describe('legacy permissions', () => {
  it('does not expose legacy permissions before legacy mode', () => {
    expect(legacyRuleAllowsAccess('family_after_legacy', false, daughter)).toBe(false);
  });

  it('keeps private forever locked even after legacy activation', () => {
    expect(legacyRuleAllowsAccess('private_forever', true, daughter)).toBe(false);
  });

  it('allows custodian only after activation', () => {
    expect(legacyRuleAllowsAccess('custodian_only', true, daughter)).toBe(true);
  });
});
