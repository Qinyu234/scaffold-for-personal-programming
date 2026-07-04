/**
 * Tests for Event Flow View (JS/TS) — DESIGN.md Phase 1.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  buildEventFlowSlice,
  listEventFlowStates,
  statesWithTriggers,
} from '../event-flow-slice';
import { graphFromEventFlowSlice } from '../graph';
import { layoutEventFlowDocument } from '../../virtual/layout';
import { createEventFlowSession } from '../../virtual/session';
import { pushOverlay } from '../../virtual/push';

const FIX = path.join(__dirname, 'fixtures');

function setup() {
  fs.mkdirSync(FIX, { recursive: true });
  fs.writeFileSync(
    path.join(FIX, 'events.tsx'),
    `import { useState } from 'react';

export function Cart() {
  const [total, setTotal] = useState(0);

  function addTen() {
    setTotal(t => t + 10);
  }

  return (
    <div>
      <button onClick={addTen}>Add 10</button>
      <button onClick={() => setTotal(t => t + 1)}>Add 1</button>
    </div>
  );
}
`,
  );
}

function cleanup() {
  if (fs.existsSync(FIX)) {
    fs.rmSync(FIX, { recursive: true, force: true });
  }
}

export function runTests(): boolean {
  console.log('Running Event Flow Slice Tests...\n');
  setup();
  let passed = 0;
  let failed = 0;
  const filePath = path.join(FIX, 'events.tsx');

  console.log('Test 1: statesWithTriggers finds total');
  try {
    const names = statesWithTriggers(filePath);
    if (names.includes('total')) {
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

  console.log('\nTest 2: slice includes trigger and write kinds');
  try {
    const slice = buildEventFlowSlice(filePath, 'total');
    const kinds = new Set(slice?.spans.map(s => s.kind));
    if (slice && kinds.has('trigger') && kinds.has('write')) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', kinds);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 3: graph has trigger→state edge');
  try {
    const slice = buildEventFlowSlice(filePath, 'total')!;
    const graph = graphFromEventFlowSlice(slice);
    const toState = graph.edges.find(e => e.target.includes('state:total') && e.source.startsWith('trigger:'));
    if (toState) {
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

  console.log('\nTest 4: layout lists event triggers before writes');
  try {
    const slice = buildEventFlowSlice(filePath, 'total')!;
    const doc = layoutEventFlowDocument(slice, filePath, new Set());
    const tri = doc.text.indexOf('event triggers');
    const wr = doc.text.indexOf('state writes');
    if (doc.text.includes('event-flow view: total') && tri >= 0 && wr > tri) {
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

  console.log('\nTest 5: push overlay updates inline handler line');
  try {
    const session = createEventFlowSession(filePath, 'total', FIX)!;
    const seg = session.document.segments.find(s => s.kind === 'write');
    if (!seg) {
      throw new Error('no write segment');
    }
    session.selectedSegmentIds = new Set([seg.id]);
    const lines = session.document.text.split(/\r?\n/);
    const idx = seg.virtualStartLine - 1;
    lines[idx] = '      <button onClick={() => setTotal(t => t + 2)}>Add 2</button>';
    pushOverlay(session, lines.join('\n'), 'selected');
    const updated = fs.readFileSync(filePath, 'utf8');
    if (updated.includes('t + 2')) {
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

  console.log('\nTest 6: listEventFlowStates includes total');
  try {
    const names = listEventFlowStates(filePath);
    if (names.includes('total')) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', names);
      failed++;
    }
  } catch {
    console.log('✗ FAILED');
    failed++;
  }

  cleanup();
  console.log(`\n=== Event Flow Slice Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
