import { memoryTreeAuthService } from './auth';
import {
  DatabaseFamilyServiceAdapter,
  DatabaseLegacyServiceAdapter,
  DatabaseMemoryServiceAdapter
} from './providers';
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
  FamilyService,
  LegacyService,
  MemoryService,
  NotificationService,
  QueueService
} from './services';

export type ActiveProviderId = 'reaper-mini-apps' | 'supabase-external' | 'unavailable';

export interface ServiceRegistry {
  auth: AuthService;
  database: DatabaseService;
  family: FamilyService;
  memory: MemoryService;
  legacy: LegacyService;
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
    family: ActiveProviderId;
    memory: ActiveProviderId;
    legacy: ActiveProviderId;
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
  family: new DatabaseFamilyServiceAdapter(memoryTreeRepository),
  memory: new DatabaseMemoryServiceAdapter(memoryTreeRepository),
  legacy: new DatabaseLegacyServiceAdapter(memoryTreeRepository),
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
    family: memoryTreeRepository.isConfigured() ? 'supabase-external' : 'unavailable',
    memory: memoryTreeRepository.isConfigured() ? 'supabase-external' : 'unavailable',
    legacy: memoryTreeRepository.isConfigured() ? 'supabase-external' : 'unavailable',
    authorization: memoryTreeRepository.isConfigured() ? 'supabase-external' : 'unavailable',
    storage: memoryTreeRepository.isConfigured() ? 'supabase-external' : 'unavailable',
    backup: 'unavailable',
    notification: 'unavailable',
    billing: 'unavailable',
    ai: 'unavailable',
    queue: 'unavailable'
  }
};
