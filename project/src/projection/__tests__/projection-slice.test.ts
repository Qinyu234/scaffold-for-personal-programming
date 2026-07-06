/**
 * Tests for Projection Slice (Def-Use View).
 */

import * as fs from 'fs';
import * as path from 'path';
import { createTempDir, removeTempDir } from '../../__tests__/temp-dir';
import { buildDefUseSlice, contractToSpans } from '../def-use-slice';
import { buildContracts } from '../../analysis/contract';
import { isValidSpan } from '../../analysis/span';

let TEST_DIR = '';

function setup() {
  TEST_DIR = createTempDir('projection-slice');
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
  removeTempDir(TEST_DIR);
  TEST_DIR = '';
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
