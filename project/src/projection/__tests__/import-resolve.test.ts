/**
 * Tests for relative import resolution (tier-1 cluster).
 */

import * as fs from 'fs';
import * as path from 'path';
import { createTempDir, removeTempDir } from '../../__tests__/temp-dir';
import { resolveImportPath } from '../import-resolve';
import { buildStructureSlice } from '../structure-slice';

let FIX = '';

function setup() {
  FIX = createTempDir('import-resolve');
  fs.mkdirSync(path.join(FIX, 'shared'), { recursive: true });
  fs.writeFileSync(path.join(FIX, 'shared', 'counter.ts'), 'export let n = 0;\n');
  fs.writeFileSync(
    path.join(FIX, 'main.ts'),
    `import { n } from './shared/counter';
export function run() { return n; }
`,
  );
}

function cleanup() {
  removeTempDir(FIX);
  FIX = '';
}

export function runTests(): boolean {
  console.log('Running Import Resolve Tests...\n');
  setup();
  let passed = 0;
  let failed = 0;
  const main = path.join(FIX, 'main.ts');
  const counter = path.join(FIX, 'shared', 'counter.ts');

  console.log('Test 1: resolveImportPath finds local file');
  try {
    const resolved = resolveImportPath(main, './shared/counter');
    if (resolved === path.normalize(counter)) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', resolved);
      failed++;
    }
  } catch {
    console.log('✗ FAILED');
    failed++;
  }

  console.log('\nTest 2: package import returns null');
  try {
    if (resolveImportPath(main, 'react') === null) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch {
    console.log('✗ FAILED');
    failed++;
  }

  console.log('\nTest 3: structure slice lists resolved member');
  try {
    const slice = buildStructureSlice(main)!;
    const member = slice.members.find(m => m.specifier === './shared/counter');
    if (slice.focalFilePath === path.normalize(main) && member?.filePath === path.normalize(counter)) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch {
    console.log('✗ FAILED');
    failed++;
  }

  cleanup();
  console.log(`\n=== Import Resolve Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
