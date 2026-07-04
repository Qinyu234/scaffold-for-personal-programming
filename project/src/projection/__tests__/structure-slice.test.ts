/**
 * Tests for Structure View — DESIGN.md Phase 1.
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildStructureSlice } from '../structure-slice';
import { graphFromStructureSlice } from '../graph';
import { layoutStructureDocument } from '../../virtual/layout';
import { createStructureSession } from '../../virtual/session';

const FIX = path.join(__dirname, 'fixtures');

function setup() {
  fs.mkdirSync(FIX, { recursive: true });
  fs.writeFileSync(
    path.join(FIX, 'module.tsx'),
    `import { useState } from 'react';
import path from 'path';

export function Module() {
  const [x, setX] = useState(0);
  return x;
}
`,
  );
  fs.writeFileSync(
    path.join(FIX, 'sample.py'),
    `import os
from collections import Counter

total = 0
`,
  );
}

function cleanup() {
  if (fs.existsSync(FIX)) {
    fs.rmSync(FIX, { recursive: true, force: true });
  }
}

export function runTests(): boolean {
  console.log('Running Structure Slice Tests...\n');
  setup();
  let passed = 0;
  let failed = 0;
  const tsPath = path.join(FIX, 'module.tsx');
  const pyPath = path.join(FIX, 'sample.py');

  console.log('Test 1: TS structure slice captures react import');
  try {
    const slice = buildStructureSlice(tsPath);
    if (slice && slice.spans.some(s => s.variableName === 'react')) {
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

  console.log('\nTest 2: graph has imports edge');
  try {
    const graph = graphFromStructureSlice(buildStructureSlice(tsPath)!);
    if (graph.edges.some(e => e.label === 'imports')) {
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

  console.log('\nTest 3: layout lists module imports');
  try {
    const doc = layoutStructureDocument(buildStructureSlice(tsPath)!, tsPath, new Set());
    if (doc.text.includes('structure view: module') && doc.text.includes('imports')) {
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

  console.log('\nTest 4: Python structure slice captures from-import');
  try {
    const slice = buildStructureSlice(pyPath);
    if (slice && slice.spans.some(s => s.variableName === 'collections')) {
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

  console.log('\nTest 5: session uses lucid://view/structure URI');
  try {
    const session = createStructureSession(tsPath, FIX)!;
    if (session.lineage.virtualUri.startsWith('lucid://view/structure/module')) {
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
  console.log(`\n=== Structure Slice Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
