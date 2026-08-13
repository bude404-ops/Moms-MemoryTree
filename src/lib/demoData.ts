import type { Family, FamilyMember, FamilyRelationship, LegacyCustodian, LifeEvent, Memory, MemoryMedia, Person, StorageUsage, StoryQuestion, UserProfile } from '../types/domain';

const now = new Date().toISOString();

export const demoUser: UserProfile = {
  id: 'user-demo-mom',
  email: 'mom@example.com',
  displayName: 'Mom'
};

export const demoFamily: Family = {
  id: 'family-willow',
  name: 'The Willow Family',
  storageLimitBytes: 500 * 1024 * 1024 * 1024,
  createdBy: demoUser.id
};

export const demoPeople: Person[] = [
  { id: 'person-mom', familyId: demoFamily.id, displayName: 'Mom', birthYear: 1970, relationshipToViewer: 'Mother', storyPrompt: 'Come hear me tell you about my life...' },
  { id: 'person-daughter', familyId: demoFamily.id, displayName: 'Daughter', birthYear: 1995, relationshipToViewer: 'Daughter' },
  { id: 'person-son', familyId: demoFamily.id, displayName: 'Son', birthYear: 1998, relationshipToViewer: 'Son' },
  { id: 'person-grandma', familyId: demoFamily.id, displayName: 'Grandma Rose', birthYear: 1946, relationshipToViewer: 'Grandmother' }
];

export const demoMembers: FamilyMember[] = [
  { id: 'member-mom', familyId: demoFamily.id, userId: demoUser.id, personId: 'person-mom', role: 'owner', status: 'active', permissions: ['memory:create', 'family:manage', 'media:upload'] },
  { id: 'member-daughter', familyId: demoFamily.id, personId: 'person-daughter', role: 'legacy_custodian', status: 'active', relationshipLabel: 'Daughter', permissions: ['legacy:request', 'memory:view_family'] },
  { id: 'member-son', familyId: demoFamily.id, personId: 'person-son', role: 'member', status: 'active', relationshipLabel: 'Son', permissions: ['memory:view_family'] }
];

export const demoRelationships: FamilyRelationship[] = [
  { id: 'rel-1', familyId: demoFamily.id, fromPersonId: 'person-mom', toPersonId: 'person-daughter', relationshipType: 'parent' },
  { id: 'rel-2', familyId: demoFamily.id, fromPersonId: 'person-mom', toPersonId: 'person-son', relationshipType: 'parent' },
  { id: 'rel-3', familyId: demoFamily.id, fromPersonId: 'person-grandma', toPersonId: 'person-mom', relationshipType: 'parent' },
  { id: 'rel-4', familyId: demoFamily.id, fromPersonId: 'person-daughter', toPersonId: 'person-son', relationshipType: 'sibling' }
];

export const storyQuestions: StoryQuestion[] = [
  { id: 'childhood-1', category: 'Childhood', question: 'What was your childhood home like?', sortOrder: 1 },
  { id: 'childhood-2', category: 'Childhood', question: 'What were your parents like?', sortOrder: 2 },
  { id: 'childhood-3', category: 'Childhood', question: 'What did you do for fun?', sortOrder: 3 },
  { id: 'teen-1', category: 'Teenage Years', question: 'What music did you listen to?', sortOrder: 10 },
  { id: 'teen-2', category: 'Teenage Years', question: 'Who were your closest friends?', sortOrder: 11 },
  { id: 'love-1', category: 'Love', question: 'How did you meet your spouse?', sortOrder: 20 },
  { id: 'love-2', category: 'Love', question: 'What was your wedding day like?', sortOrder: 21 },
  { id: 'family-1', category: 'Family', question: 'What was it like becoming a parent?', sortOrder: 30 },
  { id: 'family-2', category: 'Family', question: 'What family traditions should continue?', sortOrder: 31 },
  { id: 'life-1', category: 'Life', question: 'What are you most proud of?', sortOrder: 40 },
  { id: 'life-2', category: 'Life', question: 'What mistakes taught you the most?', sortOrder: 41 },
  { id: 'legacy-1', category: 'Legacy', question: 'What do you want your descendants to know?', sortOrder: 50 },
  { id: 'legacy-2', category: 'Legacy', question: 'What advice would you give your grandchildren?', sortOrder: 51 }
];

export const demoMemories: Memory[] = [
  { id: 'memory-childhood-home', familyId: demoFamily.id, title: 'The little yellow kitchen', description: 'Mom remembers Saturday mornings, flour on the counter, and Grandma Rose singing while making biscuits.', type: 'story', creatorId: demoUser.id, associatedPersonId: 'person-mom', dateText: '1977', locationText: 'Idaho', category: 'Childhood', privacy: 'family', legacyStatus: 'active', tags: ['childhood', 'grandma', 'home'], createdAt: now },
  { id: 'memory-grandchildren-advice', familyId: demoFamily.id, title: 'For my grandchildren when life feels heavy', description: 'A private future message prepared for descendants after legacy activation.', type: 'life_lesson', creatorId: demoUser.id, associatedPersonId: 'person-mom', dateText: '2026', category: 'Legacy', privacy: 'legacy', legacyStatus: 'legacy_ready', tags: ['advice', 'legacy'], createdAt: now },
  { id: 'memory-private-letter', familyId: demoFamily.id, title: 'A letter I am not ready to share', description: 'Private forever unless the creator changes the permission.', type: 'letter', creatorId: demoUser.id, associatedPersonId: 'person-mom', category: 'Letter', privacy: 'private', legacyStatus: 'active', tags: ['private'], createdAt: now }
];

export const demoMedia: MemoryMedia[] = [
  { id: 'media-1', familyId: demoFamily.id, memoryId: 'memory-childhood-home', storagePath: 'family/family-willow/memories/memory-childhood-home/photo-1.jpg', mediaType: 'photo', bytes: 8_200_000 },
  { id: 'media-2', familyId: demoFamily.id, memoryId: 'memory-grandchildren-advice', storagePath: 'family/family-willow/legacy/memory-grandchildren-advice/video-1.mp4', mediaType: 'video', bytes: 174_000_000 }
];

export const demoTimeline: LifeEvent[] = [
  { id: 'event-1970', familyId: demoFamily.id, personId: 'person-mom', year: 1970, title: 'Born', description: 'The beginning of Mom’s story.' },
  { id: 'event-1977', familyId: demoFamily.id, personId: 'person-mom', year: 1977, title: 'Started school', description: 'First school days and first friends.' },
  { id: 'event-1990', familyId: demoFamily.id, personId: 'person-mom', year: 1990, title: 'Met spouse', description: 'A life-changing chapter.' },
  { id: 'event-1995', familyId: demoFamily.id, personId: 'person-mom', year: 1995, title: 'First child', description: 'Parenthood begins.', memoryId: 'memory-childhood-home' },
  { id: 'event-2026', familyId: demoFamily.id, personId: 'person-mom', year: 2026, title: 'Recorded memories for grandchildren', description: 'Preserving stories for future descendants.', memoryId: 'memory-grandchildren-advice' }
];

export const demoCustodians: LegacyCustodian[] = [
  { id: 'custodian-primary', familyId: demoFamily.id, ownerUserId: demoUser.id, custodianPersonId: 'person-daughter', priority: 'primary', status: 'active' },
  { id: 'custodian-backup', familyId: demoFamily.id, ownerUserId: demoUser.id, custodianPersonId: 'person-son', priority: 'backup', status: 'active' }
];

export const demoStorage: StorageUsage = {
  familyId: demoFamily.id,
  videosBytes: 174_000_000,
  photosBytes: 8_200_000,
  audioBytes: 0,
  documentsBytes: 0,
  limitBytes: demoFamily.storageLimitBytes
};
