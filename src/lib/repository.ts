import type { SupabaseClient } from '@supabase/supabase-js';
import { MemoryTreeAuthService, type AuthSessionState } from './auth';
import { createSupabaseMediaStorageService, type UploadProgressEvent } from './mediaStorage';
import { requireSupabase, supabase } from './supabase';
import type { CostAssumptions, Family, FamilyMember, FamilyRelationship, FamilySubscription, LegacyCustodian, LifeEvent, Memory, MemoryMedia, Person, PrivacyLevel, StorageAddon, StoragePlan, StorageUsage } from '../types/domain';
import { demoCostAssumptions, demoCustodians, demoFamily, demoMembers, demoPeople, demoRelationships, demoStorage, demoStorageAddons, demoStoragePlans, demoSubscription, demoTimeline } from './demoData';

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

function mapFamily(row: Record<string, unknown>): Family {
  return {
    id: String(row.id),
    name: String(row.name),
    createdBy: String(row.created_by),
    storageLimitBytes: Number(row.storage_limit_bytes ?? 0),
    storagePlanId: row.storage_plan_id ? String(row.storage_plan_id) : undefined
  };
}

function mapPerson(row: Record<string, unknown>): Person {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    displayName: String(row.display_name),
    birthYear: row.approximate_birth_year == null ? undefined : Number(row.approximate_birth_year),
    profilePhotoUrl: row.profile_photo_path ? String(row.profile_photo_path) : undefined
  };
}

function mapMember(row: Record<string, unknown>): FamilyMember {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    userId: row.user_id ? String(row.user_id) : undefined,
    personId: String(row.person_id),
    role: row.role as FamilyMember['role'],
    relationshipLabel: row.relationship_label ? String(row.relationship_label) : undefined,
    status: row.status as FamilyMember['status'],
    permissions: Array.isArray(row.permissions) ? row.permissions.map(String) : []
  };
}

function mapMemory(row: Record<string, unknown>): Memory {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    creatorId: String(row.creator_id),
    associatedPersonId: row.person_id ? String(row.person_id) : undefined,
    title: String(row.title),
    description: row.description ? String(row.description) : '',
    type: row.memory_type as Memory['type'],
    dateText: row.approximate_date ? String(row.approximate_date) : row.memory_date ? String(row.memory_date) : undefined,
    locationText: row.location ? String(row.location) : undefined,
    category: row.category ? String(row.category) : 'Life',
    privacy: row.privacy_level as PrivacyLevel,
    legacyStatus: row.legacy_status === 'archived' || row.legacy_status === 'legacy_ready' ? row.legacy_status : 'active',
    tags: [],
    createdAt: String(row.created_at),
    softDeletedAt: row.deleted_at ? String(row.deleted_at) : undefined
  };
}

function mapMedia(row: Record<string, unknown>): MemoryMedia {
  return {
    id: String(row.id),
    memoryId: String(row.memory_id),
    familyId: String(row.family_id),
    storageBucket: String(row.storage_bucket ?? 'family-media'),
    storagePath: String(row.storage_path),
    mediaType: row.media_type as MemoryMedia['mediaType'],
    mimeType: row.mime_type ? String(row.mime_type) : undefined,
    originalFileName: row.original_file_name ? String(row.original_file_name) : row.file_name ? String(row.file_name) : undefined,
    bytes: Number(row.file_size ?? row.bytes ?? 0),
    durationSeconds: row.duration_seconds == null ? undefined : Number(row.duration_seconds),
    width: row.width == null ? undefined : Number(row.width),
    height: row.height == null ? undefined : Number(row.height),
    thumbnailPath: row.thumbnail_path ? String(row.thumbnail_path) : undefined,
    uploadStatus: row.upload_status as MemoryMedia['uploadStatus'] ?? 'completed',
    provider: row.provider ? String(row.provider) : 'supabase',
    originalPreserved: row.original_preserved == null ? true : Boolean(row.original_preserved),
    deletedAt: row.deleted_at ? String(row.deleted_at) : undefined
  };
}

function mapCustodian(row: Record<string, unknown>): LegacyCustodian {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    ownerUserId: String(row.owner_user_id),
    custodianPersonId: String(row.custodian_person_id),
    priority: row.priority as LegacyCustodian['priority'],
    status: row.status as LegacyCustodian['status']
  };
}

function mapStorageUsage(row: Record<string, unknown>, familyId: string, fallbackLimit: number): StorageUsage {
  return {
    familyId,
    videosBytes: Number(row.video_bytes ?? row.videos_bytes ?? 0),
    photosBytes: Number(row.photo_bytes ?? row.photos_bytes ?? 0),
    audioBytes: Number(row.audio_bytes ?? 0),
    documentsBytes: Number(row.document_bytes ?? row.documents_bytes ?? 0),
    thumbnailBytes: Number(row.thumbnail_bytes ?? 0),
    archiveBytes: Number(row.archive_bytes ?? 0),
    bandwidthBytes: Number(row.bandwidth_bytes ?? 0),
    limitBytes: Number(row.storage_limit_bytes ?? row.limit_bytes ?? fallbackLimit)
  };
}

function mapStoragePlan(row: Record<string, unknown>): StoragePlan {
  const features = row.features && typeof row.features === 'object' && !Array.isArray(row.features)
    ? Object.entries(row.features as Record<string, unknown>).filter(([, value]) => Boolean(value)).map(([key]) => key.replaceAll('_', ' '))
    : [];
  return {
    id: String(row.id),
    label: String(row.label ?? row.id),
    monthlyPriceCents: Number(row.monthly_price_cents ?? 0),
    currency: String(row.currency ?? 'USD'),
    quotaBytes: Number(row.quota_bytes ?? 0),
    maxFileBytes: row.max_file_bytes == null ? undefined : Number(row.max_file_bytes),
    maxVideoBytes: row.max_video_bytes == null ? undefined : Number(row.max_video_bytes),
    aiTranscriptionMinutes: Number(row.ai_transcription_minutes ?? 0),
    backupAllowanceBytes: Number(row.backup_allowance_bytes ?? 0),
    maxFamilyMembers: row.max_family_members == null ? undefined : Number(row.max_family_members),
    features,
    active: row.active == null ? true : Boolean(row.active)
  };
}

function mapSubscription(row: Record<string, unknown>): FamilySubscription {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    planId: String(row.plan_id),
    status: row.status as FamilySubscription['status'],
    currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : undefined,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    paymentsConnected: Boolean(row.payment_provider || row.payment_subscription_ref)
  };
}

function mapStorageAddon(row: Record<string, unknown>): StorageAddon {
  return {
    id: String(row.id),
    familyId: String(row.family_id),
    label: String(row.label),
    additionalBytes: Number(row.additional_bytes),
    monthlyPriceCents: Number(row.monthly_price_cents ?? 0),
    currency: String(row.currency ?? 'USD'),
    status: row.status as StorageAddon['status']
  };
}

function mapCostAssumptions(row: Record<string, unknown>): CostAssumptions {
  return {
    storageCostPerGbMonth: Number(row.storage_cost_per_gb_month ?? 0),
    bandwidthCostPerGb: Number(row.bandwidth_cost_per_gb ?? 0),
    backupCostPerGbMonth: Number(row.backup_cost_per_gb_month ?? 0),
    requestCostPer1000: Number(row.request_cost_per_1000 ?? 0),
    aiCostPerMinute: Number(row.ai_cost_per_minute ?? 0),
    aiCostPerGb: Number(row.ai_cost_per_gb ?? 0),
    paymentProcessingPercentage: Number(row.payment_processing_percentage ?? 0),
    paymentProcessingFixedFeeCents: Number(row.payment_processing_fixed_fee_cents ?? 0),
    monthlyBudgetCents: Number(row.monthly_budget_cents ?? 0),
    budgetWarningPct: Number(row.budget_warning_pct ?? 75),
    budgetCriticalPct: Number(row.budget_critical_pct ?? 90),
    budgetEmergencyPct: Number(row.budget_emergency_pct ?? 100),
    currency: String(row.currency ?? 'USD')
  };
}

export class MemoryTreeRepository {
  constructor(private readonly client: SupabaseClient | null = supabase, authService?: MemoryTreeAuthService) {
    this.authService = authService ?? new MemoryTreeAuthService(client);
  }

  private readonly authService: MemoryTreeAuthService;

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async getAuthState(): Promise<AuthSessionState> {
    return this.authService.getAuthState();
  }

  onAuthStateChange(handler: Parameters<MemoryTreeAuthService['onAuthStateChange']>[0]) {
    return this.authService.onAuthStateChange(handler);
  }

  async signInWithEmail(email: string, password: string) {
    return this.authService.signInWithEmail(email, password);
  }

  async signUpWithEmail(email: string, password: string, displayName: string) {
    return this.authService.signUpWithEmail({ email, password, displayName });
  }

  async requestPasswordReset(email: string, redirectTo?: string) {
    return this.authService.requestPasswordReset({ email, redirectTo });
  }

  async signOut() {
    return this.authService.signOut();
  }

  async listFamilies(): Promise<Family[]> {
    if (!this.client) return [demoFamily];
    const { data, error } = await this.client.from('families').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapFamily);
  }

  async createFamily(input: CreateFamilyInput): Promise<Family> {
    const client = requireSupabase();
    const { data: family, error: familyError } = await client.from('families').insert({ name: input.name, created_by: input.creatorProfileId }).select('*').single();
    if (familyError) throw familyError;
    const { data: person, error: personError } = await client.from('people').insert({ family_id: family.id, display_name: input.creatorDisplayName, created_by: input.creatorProfileId }).select('*').single();
    if (personError) throw personError;
    const { error: memberError } = await client.from('family_members').insert({ family_id: family.id, user_id: input.creatorProfileId, person_id: person.id, role: 'owner', status: 'active', joined_at: new Date().toISOString(), permissions: ['memory:create', 'family:manage', 'media:upload'] });
    if (memberError) throw memberError;
    return mapFamily(family);
  }

  async listFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    if (!this.client) return demoMembers.filter(member => member.familyId === familyId);
    const { data, error } = await this.client.from('family_members').select('*').eq('family_id', familyId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapMember);
  }

  async listPeople(familyId: string): Promise<Person[]> {
    if (!this.client) return demoPeople.filter(person => person.familyId === familyId);
    const { data, error } = await this.client.from('people').select('*').eq('family_id', familyId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapPerson);
  }

  async addPerson(familyId: string, displayName: string): Promise<Person> {
    const client = requireSupabase();
    const { data, error } = await client.from('people').insert({ family_id: familyId, display_name: displayName }).select('*').single();
    if (error) throw error;
    return mapPerson(data);
  }

  async createRelationship(input: CreateRelationshipInput): Promise<FamilyRelationship> {
    const client = requireSupabase();
    const { data, error } = await client.from('family_relationships').insert({
      family_id: input.familyId,
      from_person_id: input.fromPersonId,
      to_person_id: input.toPersonId,
      relationship_type: input.relationshipType
    }).select('*').single();
    if (error) throw error;
    return {
      id: String(data.id),
      familyId: String(data.family_id),
      fromPersonId: String(data.from_person_id),
      toPersonId: String(data.to_person_id),
      relationshipType: data.relationship_type as FamilyRelationship['relationshipType']
    };
  }

  async inviteFamilyMember(input: InviteFamilyMemberInput): Promise<FamilyMember> {
    const client = requireSupabase();
    const { data, error } = await client.from('family_members').insert({
      family_id: input.familyId,
      person_id: input.personId,
      role: input.role,
      relationship_label: input.relationshipLabel,
      status: 'invited',
      permissions: input.permissions ?? ['memory:create']
    }).select('*').single();
    if (error) throw error;
    return mapMember(data);
  }

  async listRelationships(familyId: string): Promise<FamilyRelationship[]> {
    if (!this.client) return demoRelationships.filter(rel => rel.familyId === familyId);
    const { data, error } = await this.client.from('family_relationships').select('*').eq('family_id', familyId);
    if (error) throw error;
    return (data ?? []).map(row => ({
      id: String(row.id), familyId: String(row.family_id), fromPersonId: String(row.from_person_id), toPersonId: String(row.to_person_id), relationshipType: row.relationship_type as FamilyRelationship['relationshipType']
    }));
  }

  async listMemories(familyId: string): Promise<Memory[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.from('memories').select('*').eq('family_id', familyId).is('deleted_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapMemory);
  }

  async createMemory(input: CreateMemoryInput): Promise<Memory> {
    const client = requireSupabase();
    const { data, error } = await client.from('memories').insert({
      family_id: input.familyId,
      creator_id: input.creatorId,
      person_id: input.associatedPersonId,
      title: input.title,
      description: input.description,
      memory_type: input.memoryType,
      privacy_level: input.privacy,
      category: input.category,
      approximate_date: input.approximateDate,
      location: input.locationText,
      legacy_permission: input.privacy === 'legacy' ? 'family_after_legacy' : 'private_forever',
      legacy_status: input.privacy === 'legacy' ? 'legacy_ready' : 'active'
    }).select('*').single();
    if (error) throw error;
    return mapMemory(data);
  }

  async listTimeline(familyId: string): Promise<LifeEvent[]> {
    if (!this.client) return demoTimeline.filter(event => event.familyId === familyId);
    const { data, error } = await this.client.from('life_events').select('*').eq('family_id', familyId).order('event_year');
    if (error) throw error;
    return (data ?? []).map(row => ({
      id: String(row.id),
      familyId: String(row.family_id),
      personId: String(row.person_id),
      memoryId: row.memory_id ? String(row.memory_id) : undefined,
      year: Number(row.event_year ?? 0),
      title: String(row.title),
      description: row.description ? String(row.description) : undefined
    }));
  }

  async listMemoryMedia(familyId: string): Promise<MemoryMedia[]> {
    if (!this.client) return [];
    const { data, error } = await this.client.from('memory_media').select('*').eq('family_id', familyId).eq('upload_status', 'completed').is('deleted_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapMedia);
  }

  async listLegacyCustodians(familyId: string): Promise<LegacyCustodian[]> {
    if (!this.client) return demoCustodians.filter(custodian => custodian.familyId === familyId);
    const { data, error } = await this.client.from('legacy_custodians').select('*').eq('family_id', familyId).order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapCustodian);
  }

  async getStorageUsage(familyId: string): Promise<StorageUsage> {
    if (!this.client) return { ...demoStorage, familyId };
    const { data, error } = await this.client.from('storage_usage').select('*').eq('family_id', familyId).maybeSingle();
    if (error) throw error;
    if (data) return mapStorageUsage(data, familyId, demoStorage.limitBytes);
    const { data: family } = await this.client.from('families').select('storage_limit_bytes').eq('id', familyId).maybeSingle();
    return { ...demoStorage, familyId, limitBytes: Number(family?.storage_limit_bytes ?? demoStorage.limitBytes), videosBytes: 0, photosBytes: 0, audioBytes: 0, documentsBytes: 0 };
  }

  async listStoragePlans(): Promise<StoragePlan[]> {
    if (!this.client) return demoStoragePlans;
    const { data, error } = await this.client.from('storage_plans').select('*').eq('active', true).order('sort_order');
    if (error) throw error;
    return (data ?? []).map(mapStoragePlan);
  }

  async getFamilySubscription(familyId: string): Promise<FamilySubscription> {
    if (!this.client) return { ...demoSubscription, familyId };
    const { data, error } = await this.client.from('family_subscriptions').select('*').eq('family_id', familyId).maybeSingle();
    if (error) throw error;
    if (data) return mapSubscription(data);
    return { ...demoSubscription, familyId };
  }

  async listStorageAddons(familyId: string): Promise<StorageAddon[]> {
    if (!this.client) return demoStorageAddons.filter(addon => addon.familyId === familyId);
    const { data, error } = await this.client.from('storage_addons').select('*').eq('family_id', familyId).in('status', ['trial', 'active']).order('created_at');
    if (error) throw error;
    return (data ?? []).map(mapStorageAddon);
  }

  async getCostAssumptions(): Promise<CostAssumptions> {
    if (!this.client) return demoCostAssumptions;
    const { data, error } = await this.client.from('cost_assumptions').select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error) return demoCostAssumptions;
    return data ? mapCostAssumptions(data) : demoCostAssumptions;
  }

  async uploadMemoryMedia(input: UploadMediaInput): Promise<MemoryMedia> {
    const client = this.client ?? requireSupabase();
    const upload = await createSupabaseMediaStorageService(client).upload({
      familyId: input.familyId,
      memoryId: input.memoryId,
      file: input.file,
      zone: input.zone ?? 'memories',
      signal: input.signal,
      onProgress: input.onProgress
    });
    const { data, error } = await client.from('memory_media').insert({
      family_id: input.familyId,
      memory_id: input.memoryId,
      uploaded_by: input.uploaderId,
      storage_bucket: upload.storageBucket,
      media_type: upload.mediaType,
      storage_path: upload.storagePath,
      file_name: upload.originalFileName,
      original_file_name: upload.originalFileName,
      mime_type: upload.mimeType,
      file_size: upload.bytes,
      upload_status: upload.uploadStatus,
      provider: upload.provider,
      original_preserved: true
    }).select('*').single();
    if (error) throw error;
    return mapMedia(data);
  }

  async createTemporaryMediaAccess(mediaId: string) {
    const client = this.client ?? requireSupabase();
    const { data, error } = await client.functions.invoke('signed-media-access', { body: { mediaId } });
    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Signed media access denied or unavailable.');
    return { signedUrl: String(data.signedUrl), expiresInSeconds: Number(data.expiresInSeconds ?? 300), publicUrlAllowed: false };
  }
}

export const memoryTreeRepository = new MemoryTreeRepository();
