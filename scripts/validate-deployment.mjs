import fs from 'node:fs';

const deployScript = fs.readFileSync('scripts/deploy-supabase.mjs', 'utf8');
const workflow = fs.readFileSync('docs/workflows/supabase.yml.example', 'utf8');
const docs = fs.existsSync('docs/SUPABASE_DEPLOYMENT.md') ? fs.readFileSync('docs/SUPABASE_DEPLOYMENT.md', 'utf8') : '';

const requiredDeployTerms = ['validate-migrations.mjs', 'validate-rls.mjs', 'check-secrets.mjs', 'supabase', 'db', 'push', 'functions', 'deploy', 'signed-media-access'];
for (const term of requiredDeployTerms) {
  if (!deployScript.includes(term)) throw new Error(`Deployment script missing required term: ${term}`);
}

const requiredWorkflowTerms = ['workflow_dispatch', 'npm run validate', 'supabase/setup-cli', 'SUPABASE_PROJECT_REF', 'SUPABASE_ACCESS_TOKEN', 'deploy:supabase'];
for (const term of requiredWorkflowTerms) {
  if (!workflow.includes(term)) throw new Error(`Supabase workflow missing required term: ${term}`);
}

const forbiddenLiteralPatterns = [
  /github_pat_[A-Za-z0-9_]+/,
  /ghp_[A-Za-z0-9_]+/,
  /sbp_[A-Za-z0-9_]+/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/
];
for (const [label, text] of [['deploy script', deployScript], ['workflow', workflow], ['deployment docs', docs]]) {
  for (const pattern of forbiddenLiteralPatterns) {
    if (pattern.test(text)) throw new Error(`Possible literal credential in ${label}: ${pattern}`);
  }
}

console.log('Supabase deployment automation validation passed.');
