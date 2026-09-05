#!/usr/bin/env node
// Build-time guard: every published entry of @samirdamle/nano-charts-react
// MUST start with the "use client"; directive, or Next.js App Router / RSC
// consumers silently get a server-component build. This regressed once
// already when tsup's `treeshake: true` ran a Rollup pass that stripped the
// module-level banner while the build still exited 0 (see tsup.config.ts).
// Run automatically via the "postbuild" script in package.json.

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, '..');
const distDir = path.join(packageRoot, 'dist');
const tsupConfigPath = path.join(packageRoot, 'tsup.config.ts');

// Names must stay in sync with the `entry` map in packages/react/tsup.config.ts.
// We try to derive them from that file directly (source of truth); if parsing
// ever fails (config restructured, comments confuse the regex, etc.) we fall
// back to this hardcoded list rather than silently checking zero files.
const FALLBACK_ENTRY_NAMES = [
  'index',
  'line',
  'area',
  'bar',
  'win-loss',
  'bullet',
  'donut',
  'scatter',
  'heatmap',
];

function deriveEntryNames() {
  try {
    const configSrc = readFileSync(tsupConfigPath, 'utf8');
    const entryBlockMatch = configSrc.match(/entry:\s*\{([\s\S]*?)\}/);
    if (!entryBlockMatch) return null;
    const entryBlock = entryBlockMatch[1];
    // Matches `key:` or `'key':` / `"key":` at the start of each entry line.
    const keyPattern = /(?:^|,)\s*(?:'([^']+)'|"([^"]+)"|([A-Za-z_$][\w$]*))\s*:/g;
    const names = [];
    let match;
    while ((match = keyPattern.exec(entryBlock)) !== null) {
      names.push(match[1] ?? match[2] ?? match[3]);
    }
    return names.length > 0 ? names : null;
  } catch {
    return null;
  }
}

const derived = deriveEntryNames();
const entryNames = derived ?? FALLBACK_ENTRY_NAMES;
const source = derived ? 'tsup.config.ts' : 'hardcoded fallback list';

const EXTENSIONS = ['.js', '.cjs'];
const EXPECTED_DIRECTIVE = '"use client";';

const failures = [];

for (const name of entryNames) {
  for (const ext of EXTENSIONS) {
    const filePath = path.join(distDir, `${name}${ext}`);

    if (!existsSync(filePath)) {
      failures.push({ filePath, actualFirstLine: '<file does not exist>' });
      continue;
    }

    const contents = readFileSync(filePath, 'utf8');
    const firstLine = contents.split(/\r?\n/, 1)[0];

    if (firstLine !== EXPECTED_DIRECTIVE) {
      failures.push({ filePath, actualFirstLine: firstLine });
    }
  }
}

const totalChecked = entryNames.length * EXTENSIONS.length;

if (failures.length > 0) {
  console.error(
    `\n✗ 'use client' directive missing or misplaced in ${failures.length}/${totalChecked} built entries (entry names derived from ${source}):\n`,
  );
  for (const { filePath, actualFirstLine } of failures) {
    console.error(`  ${path.relative(packageRoot, filePath)}`);
    console.error(`    expected first line: ${EXPECTED_DIRECTIVE}`);
    console.error(`    actual first line:   ${actualFirstLine}\n`);
  }
  console.error(
    'This usually means a bundler pass stripped the module-level directive from the\n' +
      'output — check `treeshake` and `banner` in packages/react/tsup.config.ts.\n' +
      '`treeshake: true` runs a Rollup pass that removes the "use client"; banner even\n' +
      'though the build still exits 0, so this guard is the only thing that catches it.\n',
  );
  process.exit(1);
}

console.log(`✓ 'use client' present in all ${totalChecked} built entries`);
