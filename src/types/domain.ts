export type PrivacyLevel = 'private' | 'family' | 'specific_people' | 'descendants' | 'legacy';
export type FamilyRole = 'family_member' | 'contributor' | 'family_manager' | 'legacy_custodian';
export type MemoryType = 'video' | 'audio' | 'photo' | 'story' | 'letter' | 'life_lesson' | 'event' | 'family_tradition' | 'recipe' | 'important_document';
export type LegacyPermissionRule = 'private_forever' | 'family_after_legacy_activation' | 'descendants_after_legacy_activation' | 'custodian_only' | 'specific_person';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}

export interface Family {
  id: string;
  name: string;
  storageLimitBytes: number;
  createdBy: string;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId?: string;
  personId: string;
  role: FamilyRole;
  relationshipLabel?: string;
  status: 'invited' | 'active' | 'removed';
  permissions: string[];
}

export interface Person {
  id: string;
  familyId: string;
  displayName: string;
  birthYear?: number;
  profilePhotoUrl?: string;
  relationshipToViewer?: string;
  storyPrompt?: string;
}

export interface FamilyRelationship {
  id: string;
  familyId: string;
  fromPersonId: string;
  toPersonId: string;
  relationshipType: 'parent' | 'child' | 'grandparent' | 'grandchild' | 'sibling' | 'spouse' | 'partner';
}

export interface Memory {
  id: string;
  familyId: string;
  title: string;
  description: string;
  type: MemoryType;
  creatorId: string;
  associatedPersonId?: string;
  dateText?: string;
  locationText?: string;
  category: string;
  privacy: PrivacyLevel;
  legacyStatus: 'active' | 'legacy_ready' | 'archived';
  tags: string[];
  createdAt: string;
  softDeletedAt?: string;
}

export interface MemoryMedia {
  id: string;
  memoryId: string;
  familyId: string;
  storagePath: string;
  mediaType: 'photo' | 'video' | 'audio' | 'document';
  bytes: number;
  signedUrlExpiresAt?: string;
}

export interface LifeEvent {
  id: string;
  familyId: string;
  personId: string;
  year: number;
  title: string;
  description?: string;
  memoryId?: string;
}

export interface StoryQuestion {
  id: string;
  category: string;
  question: string;
  sortOrder: number;
}

export interface LegacyCustodian {
  id: string;
  familyId: string;
  ownerUserId: string;
  custodianPersonId: string;
  priority: 'primary' | 'backup';
  status: 'draft' | 'active' | 'revoked';
}

export interface StorageUsage {
  familyId: string;
  videosBytes: number;
  photosBytes: number;
  audioBytes: number;
  documentsBytes: number;
  limitBytes: number;
}
