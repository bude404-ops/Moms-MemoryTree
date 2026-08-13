import type { SupabaseClient, User } from '@supabase/supabase-js';
import { requireSupabase, supabase } from './supabase';
import type { Family, FamilyMember, FamilyRelationship, LegacyCustodian, LifeEvent, Memory, MemoryMedia, Person, PrivacyLevel, StorageUsage } from '../types/domain';
import { demoCustodians, demoFamily, demoMembers, demoPeople, demoRelationships, demoStorage, demoTimeline } from './demoData';
import { signedUrlPolicy, storagePathFor } from './security';

export interface AuthSessionState {
  configured: boolean;
  user: User | null;
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
}

function mapFamily(row: Record<string, unknown>): Family {
  return {
    id: String(row.id),
    name: String(row.name),
    createdBy: String(row.created_by),
    storageLimitBytes: Number(row.storage_limit_bytes ?? 0)
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
    associatedPersonId: row.associated_person_id ? String(row.associated_person_id) : undefined,
    title: String(row.title),
    description: row.description ? String(row.description) : '',
    type: row.memory_type as Memory['type'],
    dateText: row.approximate_date ? String(row.approximate_date) : row.memory_date ? String(row.memory_date) : undefined,
    locationText: row.location_text ? String(row.location_text) : undefined,
    category: row.category ? String(row.category) : 'Life',
    privacy: row.privacy as PrivacyLevel,
    legacyStatus: row.legacy_status === 'archived' || row.legacy_status === 'legacy_ready' ? row.legacy_status : 'active',
    tags: [],
    createdAt: String(row.created_at),
    softDeletedAt: row.soft_deleted_at ? String(row.soft_deleted_at) : undefined
  };
}

function mapMedia(row: Record<string, unknown>): MemoryMedia {
  return {
    id: String(row.id),
    memoryId: String(row.memory_id),
    familyId: String(row.family_id),
    storagePath: String(row.storage_path),
    mediaType: row.media_type as MemoryMedia['mediaType'],
    bytes: Number(row.bytes ?? 0)
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
    videosBytes: Number(row.videos_bytes ?? 0),
    photosBytes: Number(row.photos_bytes ?? 0),
    audioBytes: Number(row.audio_bytes ?? 0),
    documentsBytes: Number(row.documents_bytes ?? 0),
    limitBytes: Number(row.storage_limit_bytes ?? fallbackLimit)
  };
}

export class MemoryTreeRepository {
  constructor(private readonly client: SupabaseClient | null = supabase) {}

  isConfigured(): boolean {
    return Boolean(this.client);
  }

  async getAuthState(): Promise<AuthSessionState> {
    if (!this.client) return { configured: false, user: null };
    const { data, error } = await this.client.auth.getUser();
    if (error) return { configured: true, user: null };
    return { configured: true, user: data.user };
  }

  async signInWithEmail(email: string, password: string) {
    return requireSupabase().auth.signInWithPassword({ email, password });
  }

  async signUpWithEmail(email: string, password: string, displayName: string) {
    const client = requireSupabase();
    const result = await client.auth.signUp({ email, password, options: { data: { display_name: displayName } } });
    if (result.data.user) {
      await client.from('profiles').upsert({ id: result.data.user.id, display_name: displayName });
    }
    return result;
  }

  async signOut() {
    return requireSupabase().auth.signOut();
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
    const { error: memberError } = await client.from('family_members').insert({ family_id: family.id, user_id: input.creatorProfileId, person_id: person.id, role: 'family_manager', status: 'active', joined_at: new Date().toISOString(), permissions: ['memory:create', 'family:manage', 'media:upload'] });
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
    const { data, error } = await this.client.from('memories').select('*').eq('family_id', familyId).is('soft_deleted_at', null).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapMemory);
  }

  async createMemory(input: CreateMemoryInput): Promise<Memory> {
    const client = requireSupabase();
    const { data, error } = await client.from('memories').insert({
      family_id: input.familyId,
      creator_id: input.creatorId,
      associated_person_id: input.associatedPersonId,
      title: input.title,
      description: input.description,
      memory_type: input.memoryType,
      privacy: input.privacy,
      category: input.category,
      approximate_date: input.approximateDate,
      location_text: input.locationText,
      legacy_permission: input.privacy === 'legacy' ? 'family_after_legacy_activation' : 'private_forever',
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
    const { data, error } = await this.client.from('memory_media').select('*').eq('family_id', familyId).order('created_at', { ascending: false });
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

  async uploadMemoryMedia(input: UploadMediaInput): Promise<MemoryMedia> {
    const client = requireSupabase();
    const storagePath = storagePathFor(input.familyId, input.memoryId, input.file.name, input.zone ?? 'memories');
    const upload = await client.storage.from('family-media').upload(storagePath, input.file, { contentType: input.file.type, upsert: false });
    if (upload.error) throw upload.error;
    const { data, error } = await client.from('memory_media').insert({
      family_id: input.familyId,
      memory_id: input.memoryId,
      uploaded_by: input.uploaderId,
      media_type: input.mediaType,
      storage_path: storagePath,
      mime_type: input.file.type,
      bytes: input.file.size
    }).select('*').single();
    if (error) throw error;
    return mapMedia(data);
  }

  async createTemporaryMediaAccess(storagePath: string, expiresInSeconds = 300) {
    const client = this.client ?? requireSupabase();
    const policy = signedUrlPolicy(storagePath, expiresInSeconds);
    const { data, error } = await client.storage.from('family-media').createSignedUrl(storagePath, expiresInSeconds);
    if (error) throw error;
    return { ...policy, signedUrl: data.signedUrl };
  }
}

export const memoryTreeRepository = new MemoryTreeRepository();
