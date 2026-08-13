import type {
  AIService,
  AuthorizationCheck,
  AuthorizationService,
  BackupService,
  BillingService,
  NotificationService,
  QueueService
} from '../services';
import { UnavailablePlatformService } from '../services';
import type { FamilySubscription, StoragePlan } from '../../types/domain';

export class ReaperAuthorizationProvider extends UnavailablePlatformService implements AuthorizationService {
  async canAccessFamily(): Promise<AuthorizationCheck> { return this.unavailable('Reaper server-side authorization'); }
  async canManageFamily(): Promise<AuthorizationCheck> { return this.unavailable('Reaper server-side authorization'); }
  async canViewMemory(): Promise<AuthorizationCheck> { return this.unavailable('Reaper server-side authorization'); }
  async canAccessMedia(): Promise<AuthorizationCheck> { return this.unavailable('Reaper server-side authorization'); }
}

export class ReaperBackupProvider extends UnavailablePlatformService implements BackupService {
  async createBackup(): Promise<{ backupId: string; verified: boolean }> { return this.unavailable('Reaper backup service'); }
  async verifyBackup(): Promise<{ verified: boolean; message?: string }> { return this.unavailable('Reaper backup service'); }
}

export class ReaperNotificationProvider extends UnavailablePlatformService implements NotificationService {
  async notifyFamilyInvitation(): Promise<void> { return this.unavailable('Reaper notification service'); }
  async notifyStorageWarning(): Promise<void> { return this.unavailable('Reaper notification service'); }
  async notifyArchiveReady(): Promise<void> { return this.unavailable('Reaper notification service'); }
}

export class ReaperBillingProvider extends UnavailablePlatformService implements BillingService {
  async listPlans(): Promise<StoragePlan[]> { return this.unavailable('Reaper billing service'); }
  async getSubscription(): Promise<FamilySubscription> { return this.unavailable('Reaper billing service'); }
  async startCheckout(): Promise<{ checkoutUrl?: string; provider: string }> { return this.unavailable('Reaper billing service'); }
}

export class ReaperAIProvider extends UnavailablePlatformService implements AIService {
  async transcribeMedia(): Promise<{ transcript: string; provider: string }> { return this.unavailable('Reaper AI service'); }
  async summarizeMemory(): Promise<{ summary: string; provider: string }> { return this.unavailable('Reaper AI service'); }
}

export class ReaperQueueProvider extends UnavailablePlatformService implements QueueService {
  async enqueue(): Promise<{ jobId: string }> { return this.unavailable('Reaper queue service'); }
  async getJob(): Promise<{ status: 'queued' | 'running' | 'completed' | 'failed'; message?: string }> { return this.unavailable('Reaper queue service'); }
}
