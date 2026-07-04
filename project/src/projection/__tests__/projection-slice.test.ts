/**
 * Tests for Projection Slice (Def-Use View).
 */

import * as fs from 'fs';
import * as path from 'path';
import { buildDefUseSlice, contractToSpans } from '../def-use-slice';
import { buildContracts } from '../../analysis/contract';
import { isValidSpan } from '../../analysis/span';

const TEST_DIR = path.join(__dirname, 'fixtures');

function setup() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }
  const src = `
import { useState } from 'react';
function Component() {
  const [count, setCount] = useState(0);
  function handleClick() {
    setCount(1);
    console.log(count);
  }
  return <button onClick={handleClick}>{count}</button>;
}
`;
  fs.writeFileSync(path.join(TEST_DIR, 'slice.tsx'), src);
}

function cleanup() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

export function runTests(): boolean {
  console.log('Running Projection Slice Tests...\n');
  setup();

  let passed = 0;
  let failed = 0;
  const filePath = path.join(TEST_DIR, 'slice.tsx');

  console.log('Test 1: buildDefUseSlice returns def-use slice for state name');
  try {
    const slice = buildDefUseSlice(filePath, 'count');
    if (slice && slice.viewType === 'def-use' && slice.scopeId === 'count' && slice.spans.length > 0) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch {
    console.log('✗ FAILED: crashed');
    failed++;
  }

  console.log('\nTest 2: all spans have stable file, line, column, enclosingFunction');
  try {
    const slice = buildDefUseSlice(filePath, 'count');
    const allValid = slice?.spans.every(isValidSpan) ?? false;
    if (allValid) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch {
    console.log('✗ FAILED: crashed');
    failed++;
  }

  console.log('\nTest 3: slice includes write and use kinds');
  try {
    const slice = buildDefUseSlice(filePath, 'count');
    const kinds = new Set(slice?.spans.map(s => s.kind));
    if (kinds.has('write') && kinds.has('use')) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch {
    console.log('✗ FAILED: crashed');
    failed++;
  }

  console.log('\nTest 4: null when state not found');
  try {
    const slice = buildDefUseSlice(filePath, 'missing');
    if (slice === null) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch {
    console.log('✗ FAILED: crashed');
    failed++;
  }

  console.log('\nTest 5: contractToSpans deterministic for same contract');
  try {
    const contracts = buildContracts(filePath);
    const a = contractToSpans(contracts[0], filePath);
    const b = contractToSpans(contracts[0], filePath);
    if (JSON.stringify(a) === JSON.stringify(b)) {
      console.log('✓ PASSED');
      passed++;
    } else {
      console.log('✗ FAILED');
      failed++;
    }
  } catch {
    console.log('✗ FAILED: crashed');
    failed++;
  }

  cleanup();
  console.log(`\n=== Projection Slice Tests: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

if (require.main === module) {
  process.exit(runTests() ? 0 : 1);
}
