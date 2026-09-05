#!/usr/bin/env node
// Build-time guard: fails if a package's dist/ contains anything that isn't a
// file tsup itself would produce. This exists because this working directory
// is synced by a cloud file-sync tool (iCloud Drive), which occasionally
// writes " 2"-suffixed conflict copies of in-progress build output straight
// into dist/ (observed on this machine — see e.g. "dist/scatter 2.cjs").
// Since package.json's "files": ["dist"] publishes the whole directory
// verbatim, any such stray file would otherwise ship to npm unnoticed.
import { readdirSync } from 'node:fs';
import path from 'node:path';

const distDir = path.resolve(process.cwd(), 'dist');
const entries = readdirSync(distDir);

const ALLOWED = /^[\w.-]+\.(js|cjs|mjs|d\.ts|d\.cts|d\.mts|map)$/;

const rejected = entries.filter((name) => !ALLOWED.test(name));

if (rejected.length > 0) {
  console.error(`\n✗ dist/ contains ${rejected.length} unexpected file(s):\n`);
  for (const name of rejected) console.error(`  ${name}`);
  console.error(
    '\nThese look like sync-conflict duplicates or other stray files, not build output.\n' +
      'Delete them and rebuild before publishing — "files": ["dist"] would ship them as-is.\n',
  );
  process.exit(1);
}

console.log(`✓ dist/ contains only expected build output (${entries.length} files)`);
