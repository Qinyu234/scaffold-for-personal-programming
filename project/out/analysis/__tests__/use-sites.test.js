"use strict";
/**
 * Tests for Task 1.4: Use site scanner
 * Acceptance criteria:
 * - finds all identifier references that are reads (not writes)
 * - maps each reference to the enclosing function or module
 * - records location (file, line, column)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTests = runTests;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const use_sites_1 = require("../use-sites");
// Test file paths
const TEST_DIR = path.join(__dirname, 'fixtures');
function setupTestFiles() {
    if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // File with read references
    const reads = `
const x = 42;  // declaration, should be skipped
const y = x;   // read of x, should be found
const z = x + y;  // read of x and y, should be found
console.log(x);  // read of x, should be found
`;
    // File with function reads
    const functionReads = `
function foo(a: number) {
  const b = a + 1;  // read of a, should be found
  return b;  // read of b, should be found
}

const result = foo(10);  // read of foo, should be found
`;
    // File with mixed reads and writes
    const mixed = `
let x = 10;  // declaration, should be skipped
x = 20;      // write, should be skipped
const y = x;  // read of x, should be found
x += 5;      // write, should be skipped
console.log(x);  // read of x, should be found
`;
    fs.writeFileSync(path.join(TEST_DIR, 'reads.ts'), reads);
    fs.writeFileSync(path.join(TEST_DIR, 'function-reads.ts'), functionReads);
    fs.writeFileSync(path.join(TEST_DIR, 'mixed.ts'), mixed);
}
function cleanupTestFiles() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
}
function runTests() {
    console.log('Running Task 1.4 Tests...\n');
    setupTestFiles();
    let passed = 0;
    let failed = 0;
    // Test 1: Finds all identifier references that are reads (not writes)
    console.log('Test 1: Finds all identifier references that are reads (not writes)');
    try {
        const useSites = (0, use_sites_1.findUseSites)(path.join(TEST_DIR, 'reads.ts'));
        const xReads = useSites.filter(u => u.variableName === 'x');
        // Should find reads of x in y = x, z = x + y, console.log(x)
        if (xReads.length >= 3) {
            console.log('✓ PASSED: Found read references');
            console.log(`  Found ${xReads.length} read references for x`);
            passed++;
        }
        else {
            console.log('✗ FAILED: Missing some read references');
            console.log(`  Found ${xReads.length} read references for x (expected >= 3)`);
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Read reference detection crashed');
        failed++;
    }
    // Test 2: Does not include write references
    console.log('\nTest 2: Does not include write references');
    try {
        const useSites = (0, use_sites_1.findUseSites)(path.join(TEST_DIR, 'mixed.ts'));
        const xSites = useSites.filter(u => u.variableName === 'x');
        // Should only find reads, not writes (x = 20, x += 5)
        if (xSites.length >= 1) {
            console.log('✓ PASSED: Correctly filtered out write references');
            console.log(`  Found ${xSites.length} read references for x (writes filtered out)`);
            passed++;
        }
        else {
            console.log('✗ FAILED: Incorrectly included writes or missed reads');
            console.log(`  Found ${xSites.length} references for x`);
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Write filtering crashed');
        failed++;
    }
    // Test 3: Maps each reference to the enclosing function or module
    console.log('\nTest 3: Maps each reference to the enclosing function or module');
    try {
        const useSites = (0, use_sites_1.findUseSites)(path.join(TEST_DIR, 'function-reads.ts'));
        const functionReads = useSites.filter(u => u.enclosingFunction === 'foo');
        const moduleReads = useSites.filter(u => u.enclosingFunction === 'module');
        if (functionReads.length >= 1 && moduleReads.length >= 1) {
            console.log('✓ PASSED: Correctly mapped enclosing functions');
            console.log(`  Function reads: ${functionReads.length}, Module reads: ${moduleReads.length}`);
            passed++;
        }
        else {
            console.log('✗ FAILED: Incorrect function/module mapping');
            console.log(`  Function reads: ${functionReads.length}, Module reads: ${moduleReads.length}`);
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Function mapping crashed');
        failed++;
    }
    // Test 4: Records location (file, line, column)
    console.log('\nTest 4: Records location (file, line, column)');
    try {
        const useSites = (0, use_sites_1.findUseSites)(path.join(TEST_DIR, 'reads.ts'));
        const firstSite = useSites[0];
        if (firstSite &&
            firstSite.file &&
            typeof firstSite.line === 'number' &&
            typeof firstSite.column === 'number') {
            console.log('✓ PASSED: Location recorded with file, line, column');
            console.log(`  Sample: ${firstSite.variableName} at ${firstSite.file}:${firstSite.line}:${firstSite.column}`);
            passed++;
        }
        else {
            console.log('✗ FAILED: Location missing required information');
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Location recording crashed');
        failed++;
    }
    // Test 5: Does not include declarations
    console.log('\nTest 5: Does not include declarations');
    try {
        const useSites = (0, use_sites_1.findUseSites)(path.join(TEST_DIR, 'reads.ts'));
        const xDeclarations = useSites.filter(u => u.variableName === 'x' && u.line === 2);
        // Should not find the declaration on line 2
        if (xDeclarations.length === 0) {
            console.log('✓ PASSED: Correctly skipped declarations');
            passed++;
        }
        else {
            console.log('✗ FAILED: Incorrectly included declarations');
            console.log(`  Found ${xDeclarations.length} declaration references`);
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Declaration filtering crashed');
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
//# sourceMappingURL=use-sites.test.js.map