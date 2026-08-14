import { describe, expect, it } from 'vitest';
import {
  ReaperAIProvider,
  ReaperAuthProvider,
  ReaperBackupProvider,
  ReaperBillingProvider,
  ReaperDatabaseProvider,
  ReaperNotificationProvider,
  ReaperQueueProvider,
  createMomsMemoryTreeServices,
  getPlatformCapabilityMatrix
} from '../lib/providers';

describe('provider abstraction registry', () => {
  it('documents Reaper as the preferred provider while preserving external fallback gaps', () => {
    const matrix = getPlatformCapabilityMatrix();
    expect(matrix.map(item => item.service)).toEqual([
      'AuthService',
      'DatabaseService',
      'FamilyService',
      'MemoryService',
      'MediaStorageService',
      'LegacyService',
      'AuthorizationService',
      'BackupService',
      'NotificationService',
      'BillingService',
      'AIService',
      'QueueService'
    ]);
    expect(matrix.every(item => item.preferredProvider === 'reaper')).toBe(true);
    expect(matrix.find(item => item.service === 'AuthService')?.externalFallbackRequired).toBe(true);
    expect(matrix.find(item => item.service === 'BackupService')?.activeProvider).toBe('unavailable');
  });

  it('creates a complete app service graph without requiring Reaper-only capabilities to exist yet', () => {
    const services = createMomsMemoryTreeServices();
    expect(services.auth.isConfigured()).toBe(false);
    expect(services.database.isConfigured()).toBe(false);
    expect(services.family).toBeDefined();
    expect(services.memory).toBeDefined();
    expect(services.mediaStorage).toBeDefined();
    expect(services.legacy).toBeDefined();
    expect(services.authorization).toBeDefined();
    expect(services.backup).toBeInstanceOf(ReaperBackupProvider);
    expect(services.notifications).toBeInstanceOf(ReaperNotificationProvider);
    expect(services.billing).toBeInstanceOf(ReaperBillingProvider);
    expect(services.ai).toBeInstanceOf(ReaperAIProvider);
    expect(services.queue).toBeInstanceOf(ReaperQueueProvider);
  });

  it('keeps Reaper auth/database placeholders explicit until platform support is exposed', async () => {
    const auth = new ReaperAuthProvider();
    const database = new ReaperDatabaseProvider();
    await expect(auth.getAuthState()).resolves.toEqual({ configured: false, user: null });
    await expect(database.listFamilies()).rejects.toThrow('Reaper application database is not exposed');
  });
});
