import { MemoryTreeAuthService } from './auth';
import { createSupabaseMediaStorageService, createUnavailableMediaStorageService, type MediaStorageService } from './mediaStorage';
import { MemoryTreeRepository } from './repository';
import { supabase } from './supabase';
import type {
  AIService,
  AuthService,
  AuthSessionState,
  AuthorizationCheck,
  AuthorizationService,
  BackupService,
  BillingService,
  DatabaseService,
  NotificationService,
  QueueService
} from './services';
import type { FamilySubscription, StoragePlan } from '../types/domain';

export type ProviderStatus = 'available' | 'partially_available' | 'not_available' | 'unknown';
export type ProviderId = 'reaper' | 'supabase' | 'unavailable';

export interface PlatformProviderCapability {
  service: string;
  preferredProvider: ProviderId;
  activeProvider: ProviderId;
  reaperStatus: ProviderStatus;
  externalFallbackRequired: boolean;
  notes: string;
}

export interface MomsMemoryTreeServices {
  auth: AuthService;
  database: DatabaseService;
  mediaStorage: MediaStorageService;
  authorization: AuthorizationService;
  backup: BackupService;
  notifications: NotificationService;
  billing: BillingService;
  ai: AIService;
  queue: QueueService;
}

export class UnavailableAuthProvider implements AuthService {
  constructor(private readonly message = 'Authentication provider unavailable.') {}
  isConfigured(): boolean { return false; }
  async getAuthState(): Promise<AuthSessionState> { return { configured: false, user: null }; }
  onAuthStateChange() { return { unsubscribe: () => undefined }; }
  async signInWithEmail(): Promise<{ error: Error | null }> { return { error: new Error(this.message) }; }
  async signUpWithEmail(): Promise<{ error: Error | null; user: null }> { return { error: new Error(this.message), user: null }; }
  async requestPasswordReset(): Promise<{ error: Error | null }> { return { error: new Error(this.message) }; }
  async signOut(): Promise<{ error: Error | null }> { return { error: null }; }
}

export class UnavailableDatabaseProvider implements DatabaseService {
  constructor(private readonly message = 'Database provider unavailable.') {}
  isConfigured(): boolean { return false; }
  private unavailable(): never { throw new Error(this.message); }
  async listFamilies() { return this.unavailable(); }
  async createFamily() { return this.unavailable(); }
  async listFamilyMembers() { return this.unavailable(); }
  async listPeople() { return this.unavailable(); }
  async addPerson() { return this.unavailable(); }
  async createRelationship() { return this.unavailable(); }
  async inviteFamilyMember() { return this.unavailable(); }
  async listRelationships() { return this.unavailable(); }
  async listMemories() { return this.unavailable(); }
  async createMemory() { return this.unavailable(); }
  async listTimeline() { return this.unavailable(); }
  async listMemoryMedia() { return this.unavailable(); }
  async listLegacyCustodians() { return this.unavailable(); }
  async getStorageUsage() { return this.unavailable(); }
  async listStoragePlans() { return this.unavailable(); }
  async getFamilySubscription() { return this.unavailable(); }
  async listStorageAddons() { return this.unavailable(); }
  async getCostAssumptions() { return this.unavailable(); }
  async uploadMemoryMedia() { return this.unavailable(); }
  async createTemporaryMediaAccess() { return this.unavailable(); }
}

export class UnavailableAuthorizationProvider implements AuthorizationService {
  constructor(private readonly message = 'Authorization provider unavailable.') {}
  private denied(): AuthorizationCheck { return { allowed: false, reason: this.message }; }
  async canAccessFamily(): Promise<AuthorizationCheck> { return this.denied(); }
  async canManageFamily(): Promise<AuthorizationCheck> { return this.denied(); }
  async canViewMemory(): Promise<AuthorizationCheck> { return this.denied(); }
  async canAccessMedia(): Promise<AuthorizationCheck> { return this.denied(); }
}

export class SupabaseAuthorizationProvider implements AuthorizationService {
  async canAccessFamily(): Promise<AuthorizationCheck> {
    return { allowed: false, reason: 'Supabase RLS enforces this server-side; direct client-side authorization checks are intentionally not trusted.' };
  }
  async canManageFamily(): Promise<AuthorizationCheck> {
    return { allowed: false, reason: 'Supabase RLS enforces manager permissions server-side.' };
  }
  async canViewMemory(): Promise<AuthorizationCheck> {
    return { allowed: false, reason: 'Supabase RLS and signed media RPC enforce memory access server-side.' };
  }
  async canAccessMedia(): Promise<AuthorizationCheck> {
    return { allowed: false, reason: 'Supabase signed-media-access enforces media access server-side.' };
  }
}

export class UnavailableBackupProvider implements BackupService {
  constructor(private readonly message = 'Backup provider unavailable.') {}
  async createBackup(): Promise<{ backupId: string; verified: boolean }> { throw new Error(this.message); }
  async verifyBackup(): Promise<{ verified: boolean; message?: string }> { return { verified: false, message: this.message }; }
}

export class UnavailableNotificationProvider implements NotificationService {
  constructor(private readonly message = 'Notification provider unavailable.') {}
  async notifyFamilyInvitation(): Promise<void> { throw new Error(this.message); }
  async notifyStorageWarning(): Promise<void> { throw new Error(this.message); }
  async notifyArchiveReady(): Promise<void> { throw new Error(this.message); }
}

export class UnavailableBillingProvider implements BillingService {
  constructor(private readonly message = 'Billing provider unavailable.') {}
  async listPlans(): Promise<StoragePlan[]> { throw new Error(this.message); }
  async getSubscription(): Promise<FamilySubscription> { throw new Error(this.message); }
  async startCheckout(): Promise<{ checkoutUrl?: string; provider: string }> { throw new Error(this.message); }
}

export class UnavailableAIProvider implements AIService {
  constructor(private readonly message = 'AI provider unavailable.') {}
  async transcribeMedia(): Promise<{ transcript: string; provider: string }> { throw new Error(this.message); }
  async summarizeMemory(): Promise<{ summary: string; provider: string }> { throw new Error(this.message); }
}

export class UnavailableQueueProvider implements QueueService {
  constructor(private readonly message = 'Queue provider unavailable.') {}
  async enqueue(): Promise<{ jobId: string }> { throw new Error(this.message); }
  async getJob(): Promise<{ status: 'queued' | 'running' | 'completed' | 'failed'; message?: string }> { return { status: 'failed', message: this.message }; }
}

export class ReaperAuthProvider extends UnavailableAuthProvider {
  constructor() { super('Reaper Authentication is not exposed to Moms MemoryTree yet.'); }
}

export class ReaperDatabaseProvider extends UnavailableDatabaseProvider {
  constructor() { super('Reaper application database is not exposed to Moms MemoryTree yet.'); }
}

export class ReaperAuthorizationProvider extends UnavailableAuthorizationProvider {
  constructor() { super('Reaper server-side authorization is not exposed to Moms MemoryTree yet.'); }
}

export class ReaperBackupProvider extends UnavailableBackupProvider {
  constructor() { super('Reaper backup service is not exposed to Moms MemoryTree yet.'); }
}

export class ReaperNotificationProvider extends UnavailableNotificationProvider {
  constructor() { super('Reaper notification service is not exposed to Moms MemoryTree yet.'); }
}

export class ReaperBillingProvider extends UnavailableBillingProvider {
  constructor() { super('Reaper billing service is not exposed to Moms MemoryTree yet.'); }
}

export class ReaperAIProvider extends UnavailableAIProvider {
  constructor() { super('Reaper AI service is not exposed to Moms MemoryTree yet.'); }
}

export class ReaperQueueProvider extends UnavailableQueueProvider {
  constructor() { super('Reaper queue service is not exposed to Moms MemoryTree yet.'); }
}

export function getPlatformCapabilityMatrix(): PlatformProviderCapability[] {
  const supabaseConfigured = Boolean(supabase);
  return [
    { service: 'AuthService', preferredProvider: 'reaper', activeProvider: supabaseConfigured ? 'supabase' : 'unavailable', reaperStatus: 'unknown', externalFallbackRequired: true, notes: 'Reaper user-app auth is not exposed yet; Supabase remains behind AuthService.' },
    { service: 'DatabaseService', preferredProvider: 'reaper', activeProvider: supabaseConfigured ? 'supabase' : 'unavailable', reaperStatus: 'unknown', externalFallbackRequired: true, notes: 'Reaper app-owned relational database is not exposed yet; Supabase remains behind DatabaseService.' },
    { service: 'MediaStorageService', preferredProvider: 'reaper', activeProvider: supabaseConfigured ? 'supabase' : 'unavailable', reaperStatus: 'unknown', externalFallbackRequired: true, notes: 'Reaper private large-media storage is not exposed yet; Supabase Storage remains behind MediaStorageService.' },
    { service: 'AuthorizationService', preferredProvider: 'reaper', activeProvider: supabaseConfigured ? 'supabase' : 'unavailable', reaperStatus: 'unknown', externalFallbackRequired: true, notes: 'Server-side authorization is currently enforced by Supabase RLS and signed-media RPC.' },
    { service: 'BackupService', preferredProvider: 'reaper', activeProvider: 'unavailable', reaperStatus: 'unknown', externalFallbackRequired: false, notes: 'No verified backup provider is active; preservation claims must remain limited.' },
    { service: 'NotificationService', preferredProvider: 'reaper', activeProvider: 'unavailable', reaperStatus: 'unknown', externalFallbackRequired: false, notes: 'No production notification provider is active.' },
    { service: 'BillingService', preferredProvider: 'reaper', activeProvider: 'unavailable', reaperStatus: 'unknown', externalFallbackRequired: false, notes: 'No production billing provider is active.' },
    { service: 'AIService', preferredProvider: 'reaper', activeProvider: 'unavailable', reaperStatus: 'unknown', externalFallbackRequired: false, notes: 'AI remains optional and unavailable until privacy-safe provider is configured.' },
    { service: 'QueueService', preferredProvider: 'reaper', activeProvider: 'unavailable', reaperStatus: 'unknown', externalFallbackRequired: false, notes: 'No worker/queue provider is active.' }
  ];
}

export function createMomsMemoryTreeServices(): MomsMemoryTreeServices {
  const auth = new MemoryTreeAuthService(supabase);
  const database = new MemoryTreeRepository(supabase, auth);
  const mediaStorage = supabase ? createSupabaseMediaStorageService(supabase) : createUnavailableMediaStorageService();
  const authorization = supabase ? new SupabaseAuthorizationProvider() : new UnavailableAuthorizationProvider();
  return {
    auth,
    database,
    mediaStorage,
    authorization,
    backup: new ReaperBackupProvider(),
    notifications: new ReaperNotificationProvider(),
    billing: new ReaperBillingProvider(),
    ai: new ReaperAIProvider(),
    queue: new ReaperQueueProvider()
  };
}

export const momsMemoryTreeServices = createMomsMemoryTreeServices();
