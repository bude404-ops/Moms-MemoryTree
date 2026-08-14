import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const indexPath = join(root, 'index.html');
const assetPath = join(root, 'assets', 'memorytree-hero.png');

const failures = [];

function expect(condition, message) {
  if (!condition) failures.push(message);
}

expect(existsSync(indexPath), 'index.html must exist at the repository root for GitHub Pages.');
expect(existsSync(assetPath), 'Committed shell asset assets/memorytree-hero.png must exist.');

const html = readFileSync(indexPath, 'utf8');

expect(/<title>Moms MemoryTree/.test(html), 'index.html must identify Moms MemoryTree in the title.');
expect(html.includes('assets/memorytree-hero.png'), 'index.html must reference the portable committed asset path.');
expect(!html.includes('1000016553.png'), 'index.html must not reference the old root-level generated image name.');

const requiredTabs = ['home', 'memories', 'family', 'record', 'timeline', 'legacy'];
for (const tab of requiredTabs) {
  const tabPattern = new RegExp(`data-tab=["']${tab}["']`, 'i');
  const viewPattern = new RegExp(`data-view=["']${tab}["']`, 'i');
  expect(tabPattern.test(html), `index.html must expose a ${tab} navigation tab.`);
  expect(viewPattern.test(html), `index.html must expose a ${tab} application view.`);
}

const requiredLabels = ['Home', 'Memories', 'Family', 'Record', 'Timeline', 'Legacy'];
for (const label of requiredLabels) {
  expect(html.includes(`>${label}<`) || html.includes(`aria-label="${label}"`), `Navigation must include the plain-language label ${label}.`);
}

const requiredPrinciples = [
  'Preserve what the person said',
  'Never rewrite history',
  'Original Story — Preserved',
  'Memorial Video',
  'Family After Passing'
];
for (const phrase of requiredPrinciples) {
  expect(html.includes(phrase), `Shell must include legacy principle text: ${phrase}.`);
}

expect(html.includes('localStorage'), 'GitHub Pages shell must keep browser-side persistence ready for mock services.');
expect(html.includes('moms-memorytree-family-tree'), 'Family tree persistence key must remain stable for the mock shell.');
expect(html.includes('moms-memorytree-stage4-prototype'), 'Stage 4 prototype state key must remain stable.');

const interactiveIds = [
  'mock-create-account',
  'mock-reset',
  'send-invite',
  'save-memory',
  'memory-list',
  'timeline-list',
  'prototype-status'
];
for (const id of interactiveIds) {
  expect(html.includes(`id="${id}"`), `Stage 4 interactive shell must include #${id}.`);
}

const stage4Phrases = [
  'Create preview account',
  'Save invitation',
  'Save memory',
  'Upload simulation',
  'saved to your family tree'
];
for (const phrase of stage4Phrases) {
  expect(html.includes(phrase), `Stage 4 shell must include interaction text: ${phrase}.`);
}

const stage5ServiceContracts = [
  'serviceSchemaVersion = 5',
  'mockServices =',
  'migrateState',
  'validateState',
  'persistState',
  'mock-service-status',
  'browser-local-mock',
  'schema v${serviceSchemaVersion}'
];
for (const contract of stage5ServiceContracts) {
  expect(html.includes(contract), `Stage 5 mock service hardening must include ${contract}.`);
}

expect(!/supabase\.|@supabase|SUPABASE_/i.test(html), 'index.html must not directly depend on Supabase runtime calls.');

if (failures.length) {
  console.error('GitHub shell validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('GitHub application shell validation passed.');
