import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const forbidden = [/service_role/i, /supabase_service_role/i, /password\s*=\s*['"][^'"]+/i, /sk_live_/i, /ghp_[A-Za-z0-9_]+/];
const allowedFiles = new Set(['scripts/check-secrets.mjs', 'scripts/validate-env.mjs']);
const allowed = new Set(['node_modules', 'dist', '.git']);
const hits = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (allowed.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs|sql|md|json|example|html|css)$/.test(entry.name)) {
      const rel = path.relative(root, full);
      if (allowedFiles.has(rel)) continue;
      const txt = fs.readFileSync(full, 'utf8');
      for (const pattern of forbidden) if (pattern.test(txt)) hits.push(rel);
    }
  }
}
walk(root);
if (hits.length) throw new Error(`Potential secret references found: ${[...new Set(hits)].join(', ')}`);
console.log('Secret scan passed.');
