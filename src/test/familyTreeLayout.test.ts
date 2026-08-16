import { describe, expect, it } from 'vitest';
import { demoPeople, demoRelationships } from '../lib/demoData';
import { buildFamilyTreeLayout } from '../lib/familyTreeLayout';

describe('family tree layout', () => {
  it('groups parent-child relationships into unlimited generation columns', () => {
    const layout = buildFamilyTreeLayout(demoPeople, demoRelationships);

    expect(layout.stats.people).toBe(demoPeople.length);
    expect(layout.stats.relationships).toBe(demoRelationships.length);
    expect(layout.stats.generations).toBeGreaterThanOrEqual(3);
    expect(layout.nodesById['person-grandma'].generation).toBeLessThan(layout.nodesById['person-mom'].generation);
    expect(layout.nodesById['person-mom'].generation).toBeLessThan(layout.nodesById['person-daughter'].generation);
    expect(layout.nodesById['person-mom'].childIds).toEqual(expect.arrayContaining(['person-daughter', 'person-son']));
  });

  it('keeps disconnected people visible instead of dropping them', () => {
    const layout = buildFamilyTreeLayout([
      ...demoPeople,
      { id: 'person-cousin', familyId: 'family-willow', displayName: 'Cousin Lee' }
    ], demoRelationships);

    expect(layout.nodesById['person-cousin']).toBeDefined();
    expect(layout.stats.disconnectedPeople).toBe(1);
  });
});
