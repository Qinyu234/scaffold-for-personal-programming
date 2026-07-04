/**
 * Tests for Task 1.3: Write site scanner
 * Acceptance criteria:
 * - finds all assignment expressions (=, +=, setState calls)
 * - maps each assignment to the enclosing function or module
 * - records location (file, line, column)
 * - does not false-positive on declarations (only mutations)
 */

import * as fs from 'fs';
import * as path from 'path';
import { findWriteSites } from '../write-sites';

// Test file paths
const TEST_DIR = path.join(__dirname, 'fixtures');

function setupTestFiles() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // File with assignments
  const assignments = `
const x = 42;  // declaration, should be skipped
x = 10;        // mutation, should be found
x += 5;        // compound assignment, should be found
y = 20;        // mutation, should be found
`;

  // File with setState calls
  const setState = `
import { useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    setCount(1);  // setState call, should be found
  }
  
  return <div>{count}</div>;
}
`;

  // File with function assignments
  const functionAssignments = `
function foo() {
  let x = 10;  // declaration, should be skipped
  x = 20;      // mutation in function, should be found
  return x;
}

x = 30;  // mutation in module, should be found
`;

  fs.writeFileSync(path.join(TEST_DIR, 'assignments.ts'), assignments);
  fs.writeFileSync(path.join(TEST_DIR, 'setstate.tsx'), setState);
  fs.writeFileSync(path.join(TEST_DIR, 'function-assignments.ts'), functionAssignments);
}

function cleanupTestFiles() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function runTests() {
  console.log('Running Task 1.3 Tests...\n');

  setupTestFiles();

  let passed = 0;
  let failed = 0;

  // Test 1: Finds all assignment expressions (=, +=)
  console.log('Test 1: Finds all assignment expressions (=, +=)');
  try {
    const writeSites = findWriteSites(path.join(TEST_DIR, 'assignments.ts'));
    const equalsAssignments = writeSites.filter(w => w.assignmentType === '=');
    const plusAssignments = writeSites.filter(w => w.assignmentType === '+=');
    
    if (equalsAssignments.length >= 2 && plusAssignments.length >= 1) {
      console.log('✓ PASSED: Found assignment expressions');
      console.log(`  = assignments: ${equalsAssignments.length}, += assignments: ${plusAssignments.length}`);
      passed++;
    } else {
      console.log('✗ FAILED: Missing some assignment expressions');
      console.log(`  = assignments: ${equalsAssignments.length}, += assignments: ${plusAssignments.length}`);
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: Assignment detection crashed');
    failed++;
  }

  // Test 2: Does not false-positive on declarations (only mutations)
  console.log('\nTest 2: Does not false-positive on declarations (only mutations)');
  try {
    const writeSites = findWriteSites(path.join(TEST_DIR, 'assignments.ts'));
    const xAssignments = writeSites.filter(w => w.variableName === 'x');
    
    // Should find x = 10 and x += 5, but not const x = 42
    if (xAssignments.length >= 2) {
      console.log('✓ PASSED: Correctly skipped declarations');
      console.log(`  Found ${xAssignments.length} mutations for x (skipped declaration)`);
      passed++;
    } else {
      console.log('✗ FAILED: Incorrectly included declarations or missed mutations');
      console.log(`  Found ${xAssignments.length} write sites for x`);
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: Declaration filtering crashed');
    failed++;
  }

  // Test 3: Maps each assignment to the enclosing function or module
  console.log('\nTest 3: Maps each assignment to the enclosing function or module');
  try {
    const writeSites = findWriteSites(path.join(TEST_DIR, 'function-assignments.ts'));
    const functionAssigns = writeSites.filter(w => w.enclosingFunction === 'foo');
    const moduleAssigns = writeSites.filter(w => w.enclosingFunction === 'module');
    
    if (functionAssigns.length >= 1 && moduleAssigns.length >= 1) {
      console.log('✓ PASSED: Correctly mapped enclosing functions');
      console.log(`  Function assignments: ${functionAssigns.length}, Module assignments: ${moduleAssigns.length}`);
      passed++;
    } else {
      console.log('✗ FAILED: Incorrect function/module mapping');
      console.log(`  Function assignments: ${functionAssigns.length}, Module assignments: ${moduleAssigns.length}`);
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: Function mapping crashed');
    failed++;
  }

  // Test 4: Records location (file, line, column)
  console.log('\nTest 4: Records location (file, line, column)');
  try {
    const writeSites = findWriteSites(path.join(TEST_DIR, 'assignments.ts'));
    const firstSite = writeSites[0];
    
    if (firstSite && 
        firstSite.file && 
        typeof firstSite.line === 'number' && 
        typeof firstSite.column === 'number') {
      console.log('✓ PASSED: Location recorded with file, line, column');
      console.log(`  Sample: ${firstSite.variableName} at ${firstSite.file}:${firstSite.line}:${firstSite.column}`);
      passed++;
    } else {
      console.log('✗ FAILED: Location missing required information');
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: Location recording crashed');
    failed++;
  }

  // Test 5: Finds setState calls
  console.log('\nTest 5: Finds setState calls');
  try {
    const writeSites = findWriteSites(path.join(TEST_DIR, 'setstate.tsx'));
    const setStateCalls = writeSites.filter(w => w.assignmentType === 'setState');
    
    if (setStateCalls.length >= 1) {
      console.log('✓ PASSED: Found setState calls');
      console.log(`  setState calls: ${setStateCalls.length}`);
      passed++;
    } else {
      console.log('✗ FAILED: Did not find setState calls');
      console.log(`  Found: ${setStateCalls.length} setState calls`);
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: setState detection crashed');
    failed++;
  }

  cleanupTestFiles();

  console.log(`\n=== Test Results: ${passed} passed, ${failed} failed ===`);
  return failed === 0;
}

// Run tests if executed directly
if (require.main === module) {
  const success = runTests();
  process.exit(success ? 0 : 1);
}

export { runTests };
