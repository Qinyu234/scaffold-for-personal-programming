/**
 * Tests for Task 1.1: Tree-sitter ingestion
 * Acceptance criteria:
 * - parses a single .ts or .js file without crashing
 * - outputs raw AST node list with type and position
 * - handles syntax errors gracefully (partial parse, not crash)
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseFile, getRawASTNodeList } from '../parser';

// Test file paths
const TEST_DIR = path.join(__dirname, 'fixtures');

function setupTestFiles() {
  if (!fs.existsSync(TEST_DIR)) {
    fs.mkdirSync(TEST_DIR, { recursive: true });
  }

  // Valid TypeScript file
  const validTS = `
const x: number = 42;
function foo(a: number): number {
  return a + 1;
}
const result = foo(x);
`;

  // Valid JavaScript file
  const validJS = `
const x = 42;
function foo(a) {
  return a + 1;
}
const result = foo(x);
`;

  // File with syntax error (incomplete)
  const syntaxError = `
const x: number = 42;
function foo(a: number): number {
  return a + 1;
// Missing closing brace
`;

  fs.writeFileSync(path.join(TEST_DIR, 'valid.ts'), validTS);
  fs.writeFileSync(path.join(TEST_DIR, 'valid.js'), validJS);
  fs.writeFileSync(path.join(TEST_DIR, 'syntax-error.ts'), syntaxError);
}

function cleanupTestFiles() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

function runTests() {
  console.log('Running Task 1.1 Tests...\n');

  setupTestFiles();

  let passed = 0;
  let failed = 0;

  // Test 1: Parse TypeScript file without crashing
  console.log('Test 1: Parse TypeScript file without crashing');
  try {
    const result = parseFile(path.join(TEST_DIR, 'valid.ts'));
    if (result.success && result.ast !== null) {
      console.log('✓ PASSED: TypeScript file parsed successfully');
      passed++;
    } else {
      console.log('✗ FAILED: TypeScript file parsing failed');
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: TypeScript file parsing crashed');
    failed++;
  }

  // Test 2: Parse JavaScript file without crashing
  console.log('\nTest 2: Parse JavaScript file without crashing');
  try {
    const result = parseFile(path.join(TEST_DIR, 'valid.js'));
    if (result.success && result.ast !== null) {
      console.log('✓ PASSED: JavaScript file parsed successfully');
      passed++;
    } else {
      console.log('✗ FAILED: JavaScript file parsing failed');
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: JavaScript file parsing crashed');
    failed++;
  }

  // Test 3: Output raw AST node list with type and position
  console.log('\nTest 3: Output raw AST node list with type and position');
  try {
    const result = parseFile(path.join(TEST_DIR, 'valid.ts'));
    if (result.ast) {
      const nodes = getRawASTNodeList(result.ast);
      if (nodes.length > 0) {
        const firstNode = nodes[0];
        if (firstNode.type && 
            typeof firstNode.startPosition.row === 'number' &&
            typeof firstNode.startPosition.column === 'number') {
          console.log(`✓ PASSED: AST node list contains ${nodes.length} nodes with type and position`);
          console.log(`  Sample node: type="${firstNode.type}", position=(${firstNode.startPosition.row}, ${firstNode.startPosition.column})`);
          passed++;
        } else {
          console.log('✗ FAILED: AST nodes missing type or position information');
          failed++;
        }
      } else {
        console.log('✗ FAILED: AST node list is empty');
        failed++;
      }
    } else {
      console.log('✗ FAILED: No AST generated');
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: AST node extraction crashed');
    failed++;
  }

  // Test 4: Handle syntax errors gracefully (partial parse, not crash)
  console.log('\nTest 4: Handle syntax errors gracefully (partial parse, not crash)');
  try {
    const result = parseFile(path.join(TEST_DIR, 'syntax-error.ts'));
    if (result.success) {
      console.log('✓ PASSED: Syntax error handled gracefully, no crash');
      console.log(`  Error message: ${result.error || 'None'}`);
      passed++;
    } else {
      console.log('✗ FAILED: Syntax error caused failure');
      failed++;
    }
  } catch (error) {
    console.log('✗ FAILED: Syntax error caused crash');
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
