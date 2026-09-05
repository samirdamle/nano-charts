#!/usr/bin/env node
// Builds @samirdamle/nano-charts and copies its dist output into demo/dist,
// so demo/index.html can import it via a same-directory relative path.
// That self-containment matters for GitHub Pages: a project-page URL like
// /nano-charts/ can't resolve an import path that goes "up" past the site root.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const coreDist = resolve(rootDir, 'packages/core/dist');
const demoDist = resolve(rootDir, 'demo/dist');

execSync('pnpm --filter @samirdamle/nano-charts run build', {
  cwd: rootDir,
  stdio: 'inherit',
});

if (existsSync(demoDist)) rmSync(demoDist, { recursive: true, force: true });
cpSync(coreDist, demoDist, { recursive: true });

console.log('demo: copied packages/core/dist -> demo/dist');
