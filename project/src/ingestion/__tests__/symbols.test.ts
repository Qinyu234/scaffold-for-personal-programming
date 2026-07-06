/**
 * Tests for Task 1.2: Symbol table extraction
 * Acceptance criteria:
 * - detects all variable declarations (const, let, var)
 * - detects useState() calls and extracts state name
 * - records definition site (file, line, column)
 */

import * as fs from 'fs';
import * as path from 'path';
import { createTempDir, removeTempDir } from '../../__tests__/temp-dir';
import { extractSymbolTable } from '../symbols';

let TEST_DIR = '';

function setupTestFiles() {
  TEST_DIR = createTempDir('symbols');

  // File with variable declarations
  const variables = `
const x: number = 42;
let y: string = "hello";
var z: boolean = true;
const result = x + 1;
`;

  // File with useState calls
  const useState = `
import { useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  
  return <div>{count}</div>;
}
`;

  // File with both
  const mixed = `
const x = 42;
let y = "hello";

function Component() {
  const [count, setCount] = useState(0);
  const result = count + 1;
  return <div>{count}</div>;
}
`;

  fs.writeFileSync(path.join(TEST_DIR, 'variables.ts'), variables);
  fs.writeFileSync(path.join(TEST_DIR, 'usestate.tsx'), useState);
  fs.writeFileSync(path.join(TEST_DIR, 'mixed.tsx'), mixed);
}

function cleanupTestFiles() {
  removeTempDir(TEST_DIR);
  TEST_DIR = '';
}

function runTests() {
  console.log('Running Task 1.2 Tests...\n');

  setupTestFiles();

  let passed = 0;
  let failed = 0;

  // Test 1: Detects all variable declarations (const, let, var)
  console.log('Test 1: Detects all variable declarations (const, let, var)');
  try {
    const symbolTable = extractSymbolTable(path.join(TEST_DIR, 'variables.ts'));
    const constDecls = symbolTable.variables.filter(v => v.type === 'const');
    const letDecls = symbolTable.variables.filter(v => v.type === 'let');
    const varDecls = symbolTable.variables.filter(v => v.type === 'var');
    
    if (constDecls.length >= 2 && letDecls.length >= 1 && varDecls.length >= 1) {
      console.log('✓ PASSED: Detected const, let, and var declarations');
      console.log(`  const: ${constDecls.length}, let: ${letDecls.length}, var: ${varDecls.length}`);
      passed++;
    } else {
      console.log('✗ FAILED: Missing some variable declaration types');
      console.log(`  const: ${constDecls.length}, let: ${letDecls.length}, var: ${varDecls.length}`);
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: Variable declaration detection crashed');
    failed++;
  }

  // Test 2: Detects useState() calls and extracts state name
  console.log('\nTest 2: Detects useState() calls and extracts state name');
  try {
    const symbolTable = extractSymbolTable(path.join(TEST_DIR, 'usestate.tsx'));
    const stateDecls = symbolTable.stateDeclarations;
    
    if (stateDecls.length >= 2) {
      const hasCount = stateDecls.some(s => s.name === 'count');
      const hasName = stateDecls.some(s => s.name === 'name');
      
      if (hasCount && hasName) {
        console.log('✓ PASSED: Detected useState calls and extracted state names');
        console.log(`  State names: ${stateDecls.map(s => s.name).join(', ')}`);
        passed++;
      } else {
        console.log('✗ FAILED: Missing expected state names');
        console.log(`  State names: ${stateDecls.map(s => s.name).join(', ')}`);
        failed++;
      }
    } else {
      console.log('✗ FAILED: Did not detect enough useState calls');
      console.log(`  Found: ${stateDecls.length} state declarations`);
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: useState detection crashed');
    failed++;
  }

  // Test 3: Records definition site (file, line, column)
  console.log('\nTest 3: Records definition site (file, line, column)');
  try {
    const symbolTable = extractSymbolTable(path.join(TEST_DIR, 'variables.ts'));
    const firstVar = symbolTable.variables[0];
    
    if (firstVar && 
        firstVar.file && 
        typeof firstVar.line === 'number' && 
        typeof firstVar.column === 'number') {
      console.log('✓ PASSED: Definition site recorded with file, line, column');
      console.log(`  Sample: ${firstVar.name} at ${firstVar.file}:${firstVar.line}:${firstVar.column}`);
      passed++;
    } else {
      console.log('✗ FAILED: Definition site missing required information');
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: Definition site recording crashed');
    failed++;
  }

  // Test 4: Mixed file with both variables and useState
  console.log('\nTest 4: Mixed file with both variables and useState');
  try {
    const symbolTable = extractSymbolTable(path.join(TEST_DIR, 'mixed.tsx'));
    
    if (symbolTable.variables.length >= 3 && symbolTable.stateDeclarations.length >= 1) {
      console.log('✓ PASSED: Handled mixed file correctly');
      console.log(`  Total variables: ${symbolTable.variables.length}, State: ${symbolTable.stateDeclarations.length}`);
      passed++;
    } else {
      console.log('✗ FAILED: Mixed file handling incorrect');
      console.log(`  Total variables: ${symbolTable.variables.length}, State: ${symbolTable.stateDeclarations.length}`);
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: Mixed file handling crashed');
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
