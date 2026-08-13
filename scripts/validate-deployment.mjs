import fs from 'node:fs';

const deployScript = fs.readFileSync('scripts/deploy-supabase.mjs', 'utf8');
const connectivityScript = fs.readFileSync('scripts/check-supabase-connectivity.mjs', 'utf8');
const config = fs.readFileSync('supabase/config.toml', 'utf8');
const workflow = fs.readFileSync('docs/workflows/supabase.yml.example', 'utf8');
const docs = fs.existsSync('docs/SUPABASE_DEPLOYMENT.md') ? fs.readFileSync('docs/SUPABASE_DEPLOYMENT.md', 'utf8') : '';
const envDocs = fs.readFileSync('docs/ENVIRONMENT_MANAGEMENT.md', 'utf8');
const envScript = fs.readFileSync('scripts/validate-env.mjs', 'utf8');

const requiredDeployTerms = ['validate-migrations.mjs', 'validate-rls.mjs', 'check-secrets.mjs', 'supabase', 'db', 'push', 'functions', 'deploy', 'signed-media-access', 'configuredProjectRef'];
for (const term of requiredDeployTerms) {
  if (!deployScript.includes(term)) throw new Error(`Deployment script missing required term: ${term}`);
}

const requiredWorkflowTerms = ['workflow_dispatch', 'npm run validate', 'supabase/setup-cli', 'SUPABASE_ACCESS_TOKEN', 'deploy:supabase'];
for (const term of requiredWorkflowTerms) {
  if (!workflow.includes(term)) throw new Error(`Supabase workflow missing required term: ${term}`);
}

const requiredEnvironmentTerms = ['development', 'staging', 'production', 'VITE_APP_ENV', 'validate:env', 'Never commit'];
for (const term of requiredEnvironmentTerms) {
  if (!envDocs.includes(term)) throw new Error(`Environment management docs missing required term: ${term}`);
}
if (!envScript.includes('Environment validation passed')) throw new Error('Environment validation script is missing its success sentinel.');

if (!config.includes('project_id = "foiyynmpifrpbcymjrgw"')) throw new Error('Supabase config is not linked to project ref foiyynmpifrpbcymjrgw.');
if (!connectivityScript.includes('https://foiyynmpifrpbcymjrgw.supabase.co')) throw new Error('Connectivity script missing expected Supabase project URL.');
if (!connectivityScript.includes('foiyynmpifrpbcymjrgw')) throw new Error('Connectivity script missing expected Supabase project ref.');

const forbiddenLiteralPatterns = [
  /github_pat_[A-Za-z0-9_]+/,
  /ghp_[A-Za-z0-9_]+/,
  /sbp_[A-Za-z0-9_]+/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/
];
for (const [label, text] of [['deploy script', deployScript], ['connectivity script', connectivityScript], ['workflow', workflow], ['deployment docs', docs]]) {
  for (const pattern of forbiddenLiteralPatterns) {
    if (pattern.test(text)) throw new Error(`Possible literal credential in ${label}: ${pattern}`);
  }
}

console.log('Supabase deployment automation validation passed.');
