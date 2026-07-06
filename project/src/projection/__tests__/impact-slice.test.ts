/**
 * Tests for Impact View — DESIGN.md Phase 1.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createTempDir, removeTempDir } from '../../__tests__/temp-dir';
import { buildImpactSlice, listImpactStates } from '../impact-slice';
import { graphFromImpactSlice } from '../graph';
import { layoutImpactDocument } from '../../virtual/layout';
import { createImpactSession } from '../../virtual/session';
import { pushOverlay } from '../../virtual/push';

let FIX = '';

function setup() {
  FIX = createTempDir('impact');
  fs.writeFileSync(
    path.join(FIX, 'impact.tsx'),
    `import { useState } from 'react';

export function Panel() {
  const [count, setCount] = useState(0);
  function show() { return count; }
  function bump() { setCount(c => c + 1); }
  return <span onClick={bump}>{show()}</span>;
}
`,
  );
}

function cleanup() {
  removeTempDir(FIX);
  FIX = '';
}

export function runTests(): boolean {
  console.log('Running Impact Slice Tests...\n');
  setup();
  let passed = 0;
  let failed = 0;
  const filePath = path.join(FIX, 'impact.tsx');

  console.log('Test 1: listImpactStates includes count');
  try {
    if (listImpactStates(filePath).includes('count')) {
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

  console.log('\nTest 2: slice has write and use spans');
  try {
    const slice = buildImpactSlice(filePath, 'count');
    const kinds = new Set(slice?.spans.map(s => s.kind));
    if (slice && kinds.has('write') && kinds.has('use')) {
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

  console.log('\nTest 3: graph has affects edge');
  try {
    const slice = buildImpactSlice(filePath, 'count')!;
    const edge = graphFromImpactSlice(slice).edges.find(e => e.label === 'affects');
    if (edge) {
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

  console.log('\nTest 4: layout lists downstream impact');
  try {
    const doc = layoutImpactDocument(buildImpactSlice(filePath, 'count')!, filePath, new Set());
    if (doc.text.includes('downstream impact') && doc.text.includes('mutation sites')) {
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

  console.log('\nTest 5: push updates write line');
  try {
    const session = createImpactSession(filePath, 'count', FIX)!;
    const seg = session.document.segments.find(s => s.kind === 'write');
    if (!seg) {
      throw new Error('no write');
    }
    session.selectedSegmentIds = new Set([seg.id]);
    const lines = session.document.text.split(/\r?\n/);
    lines[seg.virtualStartLine - 1] = '  function bump() { setCount(c => c + 2); }';
    pushOverlay(session, lines.join('\n'), 'selected');
    if (fs.readFileSync(filePath, 'utf8').includes('c + 2')) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  cleanup();
  console.log(`\n=== Impact Slice Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
