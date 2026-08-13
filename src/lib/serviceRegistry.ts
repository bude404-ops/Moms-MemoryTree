import { memoryTreeAuthService } from './auth';
import { memoryTreeRepository } from './repository';
import {
  ReaperAIProvider,
  ReaperAuthorizationProvider,
  ReaperBackupProvider,
  ReaperBillingProvider,
  ReaperNotificationProvider,
  ReaperQueueProvider
} from './providers/reaper';
import type {
  AIService,
  AuthService,
  AuthorizationService,
  BackupService,
  BillingService,
  DatabaseService,
  NotificationService,
  QueueService
} from './services';

export type ActiveProviderId = 'reaper-mini-apps' | 'supabase-external' | 'unavailable';

export interface ServiceRegistry {
  auth: AuthService;
  database: DatabaseService;
  authorization: AuthorizationService;
  backup: BackupService;
  notification: NotificationService;
  billing: BillingService;
  ai: AIService;
  queue: QueueService;
  providers: {
    runtime: ActiveProviderId;
    auth: ActiveProviderId;
    database: ActiveProviderId;
    authorization: ActiveProviderId;
    storage: ActiveProviderId;
    backup: ActiveProviderId;
    notification: ActiveProviderId;
    billing: ActiveProviderId;
    ai: ActiveProviderId;
    queue: ActiveProviderId;
  };
}

export const serviceRegistry: ServiceRegistry = {
  auth: memoryTreeAuthService,
  database: memoryTreeRepository,
  authorization: new ReaperAuthorizationProvider(),
  backup: new ReaperBackupProvider(),
  notification: new ReaperNotificationProvider(),
  billing: new ReaperBillingProvider(),
  ai: new ReaperAIProvider(),
  queue: new ReaperQueueProvider(),
  providers: {
    runtime: 'reaper-mini-apps',
    auth: memoryTreeAuthService.isConfigured() ? 'supabase-external' : 'unavailable',
    database: memoryTreeRepository.isConfigured() ? 'supabase-external' : 'unavailable',
    authorization: memoryTreeRepository.isConfigured() ? 'supabase-external' : 'unavailable',
    storage: memoryTreeRepository.isConfigured() ? 'supabase-external' : 'unavailable',
    backup: 'unavailable',
    notification: 'unavailable',
    billing: 'unavailable',
    ai: 'unavailable',
    queue: 'unavailable'
  }
};
