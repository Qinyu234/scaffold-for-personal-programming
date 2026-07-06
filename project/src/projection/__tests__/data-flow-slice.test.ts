/**
 * Tests for Data Flow View (Python) — DESIGN.md Phase 1.
 */

import * as fs from 'fs';
import * as path from 'path';
import { createTempDir, removeTempDir } from '../../__tests__/temp-dir';
import { buildDataFlowSlice, listPythonDataNames } from '../data-flow-slice';
import { graphFromDataFlowSlice } from '../graph';
import { layoutDataFlowDocument } from '../../virtual/layout';
import { createDataFlowSession } from '../../virtual/session';
import { pushOverlay } from '../../virtual/push';
import { inferPythonDataType } from '../../analysis/data-type';
import { buildPythonContracts } from '../../analysis/python-contract';

let FIX = '';

function setup() {
  FIX = createTempDir('data-flow');
  fs.writeFileSync(
    path.join(FIX, 'flow.py'),
    `cart_total: int = 0

def add_item(price: float):
    global cart_total
    cart_total += price

def show_total():
    return cart_total

label = "cart"
`,
  );
}

function cleanup() {
  removeTempDir(FIX);
  FIX = '';
}

export function runTests(): boolean {
  console.log('Running Data Flow Slice Tests...\n');
  setup();
  let passed = 0;
  let failed = 0;
  const filePath = path.join(FIX, 'flow.py');

  console.log('Test 1: infer int64 from Python int hint');
  try {
    const contracts = buildPythonContracts(filePath);
    const cart = contracts.find(c => c.variableName === 'cart_total');
    const dt = cart ? inferPythonDataType(filePath, cart) : null;
    if (dt && dt.interpretation === 'int64' && dt.length === 'fixed') {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', dt);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 2: infer string (unsized) from literal');
  try {
    const contracts = buildPythonContracts(filePath);
    const label = contracts.find(c => c.variableName === 'label');
    const dt = label ? inferPythonDataType(filePath, label) : null;
    if (dt && dt.interpretation === 'string' && dt.length === 'unsized') {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', dt);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 3: buildDataFlowSlice returns typed slice');
  try {
    const slice = buildDataFlowSlice(filePath, 'cart_total');
    if (slice && slice.viewType === 'data-flow' && slice.dataType.label === 'int64' && slice.spans.length > 0) {
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

  console.log('\nTest 4: graph has type→data interpret edge');
  try {
    const slice = buildDataFlowSlice(filePath, 'cart_total')!;
    const graph = graphFromDataFlowSlice(slice);
    const interpret = graph.edges.find(e => e.label === 'interpret');
    const hasType = graph.nodes.some(n => n.kind === 'data' && n.id.startsWith('type:'));
    if (interpret && hasType) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED', graph);
      failed++;
    }
  } catch (e) {
    console.log('✗ FAILED', e);
    failed++;
  }

  console.log('\nTest 5: layout includes type header and write/use sections');
  try {
    const slice = buildDataFlowSlice(filePath, 'cart_total')!;
    const doc = layoutDataFlowDocument(slice, filePath, new Set());
    if (
      doc.text.includes('data-flow view: cart_total') &&
      doc.text.includes('type: int64') &&
      doc.text.includes('write sites') &&
      doc.text.includes('read sites')
    ) {
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

  console.log('\nTest 6: session + push overlay updates source line');
  try {
    const session = createDataFlowSession(filePath, 'cart_total', FIX)!;
    const seg = session.document.segments.find(s => s.kind === 'write');
    if (!seg) {
      throw new Error('no write segment');
    }
    session.selectedSegmentIds = new Set([seg.id]);
    const lines = session.document.text.split(/\r?\n/);
    const idx = seg.virtualStartLine - 1;
    lines[idx] = '    cart_total += price * 2';
    pushOverlay(session, lines.join('\n'), 'selected');
    const updated = fs.readFileSync(filePath, 'utf8');
    if (updated.includes('cart_total += price * 2')) {
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

  console.log('\nTest 7: listPythonDataNames returns data variables');
  try {
    const names = listPythonDataNames(filePath);
    if (names.includes('cart_total') && names.includes('label')) {
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
  console.log(`\n=== Data Flow Slice Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
