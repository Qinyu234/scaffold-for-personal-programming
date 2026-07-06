/**
 * Tests for Entry Point View (JS/TS) — DESIGN.md Phase 1.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createTempDir, removeTempDir } from '../../__tests__/temp-dir';
import { buildEntryPointSlice, listEntryPointFunctions } from '../entry-point-slice';
import { graphFromEntryPointSlice } from '../graph';
import { layoutEntryPointDocument } from '../../virtual/layout';
import { createEntryPointSession } from '../../virtual/session';
import { pushOverlay } from '../../virtual/push';

let FIX = '';

function setup() {
  FIX = createTempDir('entry-point');
  fs.writeFileSync(
    path.join(FIX, 'entry.tsx'),
    `export function CartPanel() {
  function showTotal() {
    return cartTotal;
  }
  function showSpinner() {
    return isLoading ? '...' : null;
  }
  let cartTotal = 0;
  let isLoading = false;
  return (
    <div>
      <span>{showTotal()}</span>
      {showSpinner()}
    </div>
  );
}
`,
  );
}

function cleanup() {
  removeTempDir(FIX);
  FIX = '';
}

export function runTests(): boolean {
  console.log('Running Entry Point Slice Tests...\n');
  setup();
  let passed = 0;
  let failed = 0;
  const filePath = path.join(FIX, 'entry.tsx');

  console.log('Test 1: listEntryPointFunctions finds nested functions');
  try {
    const names = listEntryPointFunctions(filePath);
    if (names.includes('CartPanel') && names.includes('showTotal') && names.includes('showSpinner')) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', names);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 2: call order from CartPanel entry');
  try {
    const slice = buildEntryPointSlice(filePath, 'CartPanel');
    if (
      slice &&
      slice.callOrder[0] === 'CartPanel' &&
      slice.callOrder.includes('showTotal') &&
      slice.callOrder.includes('showSpinner')
    ) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', slice?.callOrder);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 3: graph has call edges');
  try {
    const slice = buildEntryPointSlice(filePath, 'CartPanel')!;
    const graph = graphFromEntryPointSlice(slice);
    const calls = graph.edges.filter(e => e.label === 'calls');
    if (calls.some(e => e.target.includes('showTotal'))) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', graph.edges);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 4: layout ordered by callOrder with function bodies');
  try {
    const slice = buildEntryPointSlice(filePath, 'CartPanel')!;
    const doc = layoutEntryPointDocument(slice, filePath, new Set());
    if (
      doc.text.includes('entry-point view: CartPanel') &&
      doc.text.indexOf('CartPanel') < doc.text.indexOf('showTotal') &&
      doc.segments.some(s => (s.sourceEndLine ?? s.sourceLine) > s.sourceLine)
    ) {
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

  console.log('\nTest 5: push overlay updates multi-line function body');
  try {
    const session = createEntryPointSession(filePath, 'showTotal', FIX)!;
    const seg = session.document.segments.find(s => s.enclosingFunction === 'showTotal');
    if (!seg) {
      throw new Error('no showTotal segment');
    }
    session.selectedSegmentIds = new Set([seg.id]);
    const lines = session.document.text.split(/\r?\n/);
    const start = seg.virtualStartLine - 1;
    const end = seg.virtualEndLine;
    const bodyLines = lines.slice(start, end);
    const retIdx = bodyLines.findIndex(l => l.includes('return'));
    if (retIdx >= 0) {
      bodyLines[retIdx] = '    return cartTotal + 1;';
    }
    lines.splice(start, end - start, ...bodyLines);
    pushOverlay(session, lines.join('\n'), 'selected');
    const updated = fs.readFileSync(filePath, 'utf8');
    if (updated.includes('return cartTotal + 1')) {
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
  console.log(`\n=== Entry Point Slice Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
