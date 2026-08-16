import type { FamilyRelationship, Person } from '../types/domain';

export interface FamilyTreeNode {
  person: Person;
  generation: number;
  parentIds: string[];
  childIds: string[];
  partnerIds: string[];
  siblingIds: string[];
  relationshipLabels: string[];
}

export interface FamilyTreeGeneration {
  generation: number;
  label: string;
  nodes: FamilyTreeNode[];
}

export interface FamilyTreeLayout {
  generations: FamilyTreeGeneration[];
  nodesById: Record<string, FamilyTreeNode>;
  relationshipSummaries: string[];
  stats: {
    people: number;
    relationships: number;
    generations: number;
    connectedPeople: number;
    disconnectedPeople: number;
  };
}

const partnerTypes = new Set<FamilyRelationship['relationshipType']>(['spouse', 'partner']);
const lateralTypes = new Set<FamilyRelationship['relationshipType']>(['sibling']);

function generationLabel(generation: number) {
  if (generation < 0) return `${Math.abs(generation)} generation${Math.abs(generation) === 1 ? '' : 's'} before`;
  if (generation === 0) return 'Anchor generation';
  return `${generation} generation${generation === 1 ? '' : 's'} after`;
}

function createNode(person: Person): FamilyTreeNode {
  return {
    person,
    generation: 0,
    parentIds: [],
    childIds: [],
    partnerIds: [],
    siblingIds: [],
    relationshipLabels: []
  };
}

function addUnique(target: string[], value: string) {
  if (value && !target.includes(value)) target.push(value);
}

function sortPeople(a: Person, b: Person) {
  if (a.birthYear && b.birthYear && a.birthYear !== b.birthYear) return a.birthYear - b.birthYear;
  if (a.birthYear && !b.birthYear) return -1;
  if (!a.birthYear && b.birthYear) return 1;
  return a.displayName.localeCompare(b.displayName);
}

export function buildFamilyTreeLayout(people: Person[], relationships: FamilyRelationship[]): FamilyTreeLayout {
  const nodesById = Object.fromEntries(people.map(person => [person.id, createNode(person)]));
  const personIds = new Set(people.map(person => person.id));
  const childrenByParent = new Map<string, string[]>();
  const parentsByChild = new Map<string, string[]>();
  const relationshipSummaries: string[] = [];

  for (const relationship of relationships) {
    const from = nodesById[relationship.fromPersonId];
    const to = nodesById[relationship.toPersonId];
    if (!from || !to) continue;

    const fromName = from.person.displayName;
    const toName = to.person.displayName;
    relationshipSummaries.push(`${fromName} → ${relationship.relationshipType.replace('_', ' ')} → ${toName}`);

    if (relationship.relationshipType === 'parent' || relationship.relationshipType === 'grandparent') {
      addUnique(from.childIds, to.person.id);
      addUnique(to.parentIds, from.person.id);
      addUnique(childrenByParent.get(from.person.id) ?? childrenByParent.set(from.person.id, []).get(from.person.id)!, to.person.id);
      addUnique(parentsByChild.get(to.person.id) ?? parentsByChild.set(to.person.id, []).get(to.person.id)!, from.person.id);
    } else if (relationship.relationshipType === 'child' || relationship.relationshipType === 'grandchild') {
      addUnique(from.parentIds, to.person.id);
      addUnique(to.childIds, from.person.id);
      addUnique(childrenByParent.get(to.person.id) ?? childrenByParent.set(to.person.id, []).get(to.person.id)!, from.person.id);
      addUnique(parentsByChild.get(from.person.id) ?? parentsByChild.set(from.person.id, []).get(from.person.id)!, to.person.id);
    } else if (partnerTypes.has(relationship.relationshipType)) {
      addUnique(from.partnerIds, to.person.id);
      addUnique(to.partnerIds, from.person.id);
    } else if (lateralTypes.has(relationship.relationshipType)) {
      addUnique(from.siblingIds, to.person.id);
      addUnique(to.siblingIds, from.person.id);
    }

    addUnique(from.relationshipLabels, `${relationship.relationshipType.replace('_', ' ')}: ${toName}`);
    addUnique(to.relationshipLabels, `linked from ${fromName}`);
  }

  const roots = people.filter(person => !(parentsByChild.get(person.id)?.length)).sort(sortPeople);
  const queue: Array<{ id: string; generation: number }> = roots.length
    ? roots.map(person => ({ id: person.id, generation: 0 }))
    : people.slice().sort(sortPeople).map(person => ({ id: person.id, generation: 0 }));
  const assigned = new Map<string, number>();

  while (queue.length) {
    const current = queue.shift()!;
    if (!personIds.has(current.id)) continue;
    const previous = assigned.get(current.id);
    if (previous != null && previous <= current.generation) continue;
    assigned.set(current.id, current.generation);
    for (const childId of childrenByParent.get(current.id) ?? []) {
      queue.push({ id: childId, generation: current.generation + 1 });
    }
  }

  for (const person of people) {
    const generation = assigned.get(person.id) ?? 0;
    nodesById[person.id].generation = generation;
  }

  const generationMap = new Map<number, FamilyTreeNode[]>();
  for (const node of Object.values(nodesById)) {
    const group = generationMap.get(node.generation) ?? [];
    group.push(node);
    generationMap.set(node.generation, group);
  }

  const generations = [...generationMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([generation, nodes]) => ({
      generation,
      label: generationLabel(generation),
      nodes: nodes.sort((a, b) => sortPeople(a.person, b.person))
    }));

  const connectedPeople = Object.values(nodesById).filter(node => node.parentIds.length || node.childIds.length || node.partnerIds.length || node.siblingIds.length).length;

  return {
    generations,
    nodesById,
    relationshipSummaries,
    stats: {
      people: people.length,
      relationships: relationshipSummaries.length,
      generations: generations.length,
      connectedPeople,
      disconnectedPeople: people.length - connectedPeople
    }
  };
}
