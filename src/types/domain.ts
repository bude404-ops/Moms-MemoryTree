export type PrivacyLevel = 'private' | 'family' | 'specific_people' | 'descendants' | 'legacy';
export type FamilyRole = 'owner' | 'manager' | 'member' | 'contributor' | 'legacy_custodian';
export type MemoryType = 'video' | 'audio' | 'photo' | 'story' | 'letter' | 'life_lesson' | 'event' | 'family_tradition' | 'recipe' | 'document';
export type LegacyPermissionRule = 'private_forever' | 'family_after_legacy' | 'descendants_after_legacy' | 'custodian_only' | 'specific_person';

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
  storagePlanId?: string;
  createdBy: string;
}

export interface StoragePlan {
  id: string;
  label: string;
  monthlyPriceCents: number;
  currency: string;
  quotaBytes: number;
  maxFileBytes?: number;
  maxVideoBytes?: number;
  aiTranscriptionMinutes: number;
  backupAllowanceBytes: number;
  maxFamilyMembers?: number;
  features: string[];
  active: boolean;
}

export interface FamilySubscription {
  id: string;
  familyId: string;
  planId: string;
  status: 'trial' | 'active' | 'cancelled' | 'past_due' | 'expired';
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  paymentsConnected: boolean;
}

export interface StorageAddon {
  id: string;
  familyId: string;
  label: string;
  additionalBytes: number;
  monthlyPriceCents: number;
  currency: string;
  status: FamilySubscription['status'];
}

export interface CostAssumptions {
  storageCostPerGbMonth: number;
  bandwidthCostPerGb: number;
  backupCostPerGbMonth: number;
  requestCostPer1000: number;
  aiCostPerMinute: number;
  aiCostPerGb: number;
  paymentProcessingPercentage: number;
  paymentProcessingFixedFeeCents: number;
  monthlyBudgetCents: number;
  budgetWarningPct: number;
  budgetCriticalPct: number;
  budgetEmergencyPct: number;
  currency: string;
}

export interface StorageWarningThreshold {
  id: string;
  percentUsed: number;
  severity: 'info' | 'warning' | 'critical' | 'urgent' | 'blocked';
  message: string;
}

export interface StorageCostSummary {
  usedBytes: number;
  allowedBytes: number;
  remainingBytes: number;
  percentUsed: number;
  estimatedStorageCostCents: number;
  estimatedBandwidthCostCents: number;
  estimatedBackupCostCents: number;
  estimatedAiCostCents: number;
  estimatedPaymentProcessingCents: number;
  estimatedTotalCostCents: number;
  monthlyRevenueCents: number;
  estimatedGrossProfitCents: number;
  estimatedMarginPct: number | null;
  warning?: StorageWarningThreshold;
}

export interface CreatorCostDashboard {
  totalFamilies: number;
  freeFamilies: number;
  paidFamilies: number;
  totalStorageBytes: number;
  videoBytes: number;
  photoBytes: number;
  audioBytes: number;
  documentBytes: number;
  bandwidthBytes: number;
  monthlyRevenueCents: number;
  estimatedInfrastructureCostCents: number;
  estimatedGrossProfitCents: number;
  estimatedMarginPct: number | null;
  storageCostPerFamilyCents: number;
  averageStoragePerPaidFamilyBytes: number;
  averageStoragePerFreeFamilyBytes: number;
  highestStorageFamilies: Array<{ familyId: string; familyName: string; usedBytes: number; planId: string }>;
  approachingLimits: Array<{ familyId: string; familyName: string; percentUsed: number }>;
  planProfitability: Array<{ planId: string; revenueCents: number; averageStorageBytes: number; estimatedCostCents: number; marginCents: number }>;
  forecast: { currentBytes: number; thirtyDayGrowthBytes: number; ninetyDayGrowthBytes: number; oneYearProjectionBytes: number; threeYearProjectionBytes: number };
  alerts: string[];
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

export type MediaUploadStatus = 'pending' | 'uploading' | 'paused' | 'processing' | 'completed' | 'failed' | 'deleted';

export interface MemoryMedia {
  id: string;
  memoryId: string;
  familyId: string;
  storageBucket: string;
  storagePath: string;
  mediaType: 'photo' | 'video' | 'audio' | 'document';
  mimeType?: string;
  originalFileName?: string;
  bytes: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
  thumbnailPath?: string;
  uploadStatus: MediaUploadStatus;
  provider?: string;
  originalPreserved?: boolean;
  signedUrlExpiresAt?: string;
  deletedAt?: string;
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
  thumbnailBytes?: number;
  archiveBytes?: number;
  bandwidthBytes?: number;
  limitBytes: number;
}
