import type {
  CostAssumptions,
  Family,
  FamilyMember,
  FamilyRelationship,
  FamilySubscription,
  LegacyCustodian,
  LifeEvent,
  Memory,
  MemoryMedia,
  Person,
  PrivacyLevel,
  StorageAddon,
  StoragePlan,
  StorageUsage
} from '../types/domain';
import type { UploadProgressEvent } from './mediaStorage';

export interface AppUser {
  id: string;
  email?: string;
  userMetadata?: Record<string, unknown>;
}

export interface AuthSessionState {
  configured: boolean;
  user: AppUser | null;
}

export interface SignUpInput {
  email: string;
  password: string;
  displayName: string;
}

export interface PasswordResetInput {
  email: string;
  redirectTo?: string;
}

export type AuthStateHandler = (event: string, session: unknown | null) => void;

export interface AuthService {
  isConfigured(): boolean;
  getAuthState(): Promise<AuthSessionState>;
  onAuthStateChange(handler: AuthStateHandler): { unsubscribe: () => void };
  signInWithEmail(email: string, password: string): Promise<{ error: Error | null }>;
  signUpWithEmail(input: SignUpInput): Promise<{ error: Error | null; user?: AppUser | null }>;
  requestPasswordReset(input: PasswordResetInput): Promise<{ error: Error | null }>;
  signOut(): Promise<{ error: Error | null }>;
}

export interface CreateFamilyInput {
  name: string;
  creatorProfileId: string;
  creatorDisplayName: string;
}

export interface CreateMemoryInput {
  familyId: string;
  creatorId: string;
  title: string;
  description?: string;
  memoryType: Memory['type'];
  privacy: PrivacyLevel;
  category?: string;
  associatedPersonId?: string;
  approximateDate?: string;
  locationText?: string;
}

export interface InviteFamilyMemberInput {
  familyId: string;
  personId: string;
  email?: string;
  role: FamilyMember['role'];
  relationshipLabel?: string;
  permissions?: string[];
}

export interface CreateRelationshipInput {
  familyId: string;
  fromPersonId: string;
  toPersonId: string;
  relationshipType: FamilyRelationship['relationshipType'];
}

export interface UploadMediaInput {
  familyId: string;
  memoryId: string;
  uploaderId: string;
  file: File;
  mediaType: MemoryMedia['mediaType'];
  zone?: 'memories' | 'people' | 'timeline' | 'legacy';
  signal?: AbortSignal;
  onProgress?: (event: UploadProgressEvent) => void;
}

export interface TemporaryMediaAccess {
  signedUrl: string;
  expiresInSeconds: number;
  publicUrlAllowed: false;
}

export interface DatabaseService {
  isConfigured(): boolean;
  listFamilies(): Promise<Family[]>;
  createFamily(input: CreateFamilyInput): Promise<Family>;
  listFamilyMembers(familyId: string): Promise<FamilyMember[]>;
  listPeople(familyId: string): Promise<Person[]>;
  addPerson(familyId: string, displayName: string): Promise<Person>;
  createRelationship(input: CreateRelationshipInput): Promise<FamilyRelationship>;
  inviteFamilyMember(input: InviteFamilyMemberInput): Promise<FamilyMember>;
  listRelationships(familyId: string): Promise<FamilyRelationship[]>;
  listMemories(familyId: string): Promise<Memory[]>;
  createMemory(input: CreateMemoryInput): Promise<Memory>;
  listTimeline(familyId: string): Promise<LifeEvent[]>;
  listMemoryMedia(familyId: string): Promise<MemoryMedia[]>;
  listLegacyCustodians(familyId: string): Promise<LegacyCustodian[]>;
  getStorageUsage(familyId: string): Promise<StorageUsage>;
  listStoragePlans(): Promise<StoragePlan[]>;
  getFamilySubscription(familyId: string): Promise<FamilySubscription>;
  listStorageAddons(familyId: string): Promise<StorageAddon[]>;
  getCostAssumptions(): Promise<CostAssumptions>;
  uploadMemoryMedia(input: UploadMediaInput): Promise<MemoryMedia>;
  createTemporaryMediaAccess(mediaId: string): Promise<TemporaryMediaAccess>;
}

export interface AuthorizationCheck {
  allowed: boolean;
  reason?: string;
}

export interface AuthorizationService {
  canAccessFamily(userId: string, familyId: string): Promise<AuthorizationCheck>;
  canManageFamily(userId: string, familyId: string): Promise<AuthorizationCheck>;
  canViewMemory(userId: string, memoryId: string): Promise<AuthorizationCheck>;
  canAccessMedia(userId: string, mediaId: string): Promise<AuthorizationCheck>;
}

export interface BackupService {
  createBackup(familyId: string): Promise<{ backupId: string; verified: boolean }>;
  verifyBackup(backupId: string): Promise<{ verified: boolean; message?: string }>;
}

export interface NotificationService {
  notifyFamilyInvitation(input: { familyId: string; email: string; invitedBy: string }): Promise<void>;
  notifyStorageWarning(input: { familyId: string; percentageUsed: number }): Promise<void>;
  notifyArchiveReady(input: { familyId: string; archiveId: string }): Promise<void>;
}

export interface BillingService {
  listPlans(): Promise<StoragePlan[]>;
  getSubscription(familyId: string): Promise<FamilySubscription>;
  startCheckout(input: { familyId: string; planId: string }): Promise<{ checkoutUrl?: string; provider: string }>;
}

export interface AIService {
  transcribeMedia(input: { familyId: string; mediaId: string }): Promise<{ transcript: string; provider: string }>;
  summarizeMemory(input: { familyId: string; memoryId: string }): Promise<{ summary: string; provider: string }>;
}

export interface QueueService {
  enqueue(job: { type: string; familyId: string; payload: Record<string, unknown> }): Promise<{ jobId: string }>;
  getJob(jobId: string): Promise<{ status: 'queued' | 'running' | 'completed' | 'failed'; message?: string }>;
}

export class UnavailablePlatformService {
  protected unavailable(capability: string): never {
    throw new Error(`${capability} is not available from Reaper Mini Apps in this environment yet.`);
  }
}
