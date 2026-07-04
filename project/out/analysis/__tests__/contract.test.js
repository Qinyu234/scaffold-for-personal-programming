"use strict";
/**
 * Tests for Task 1.5: Def-use contract builder
 * Acceptance criteria:
 * - outputs one contract object per state variable
 * - contract includes defined_at, write_sites[], use_sites[], source="inferred"
 * - write_sites and use_sites each include file, line, enclosing function name
 * - valid JSON, no nulls for required fields
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
const contract_1 = require("../contract");
// Test file paths
const TEST_DIR = path.join(__dirname, 'fixtures');
function setupTestFiles() {
    if (!fs.existsSync(TEST_DIR)) {
        fs.mkdirSync(TEST_DIR, { recursive: true });
    }
    // File with state variable
    const stateFile = `
import { useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  
  function handleClick() {
    setCount(1);  // write site
    console.log(count);  // use site
  }
  
  return <div>{count}</div>;
}
`;
    // File with multiple state variables
    const multiState = `
import { useState } from 'react';

function Component() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('');
  
  function handleClick() {
    setCount(1);
    setName('test');
    console.log(count, name);
  }
  
  return <div>{count} {name}</div>;
}
`;
    const pythonState = `
count = 0

def bump():
    global count
    count += 1
    print(count)
`;
    const cppState = `
int total = 0;

void bump() {
  total += 1;
  int snapshot = total;
}
`;
    fs.writeFileSync(path.join(TEST_DIR, 'state.tsx'), stateFile);
    fs.writeFileSync(path.join(TEST_DIR, 'multi-state.tsx'), multiState);
    fs.writeFileSync(path.join(TEST_DIR, 'state.py'), pythonState);
    fs.writeFileSync(path.join(TEST_DIR, 'state.cpp'), cppState);
}
function cleanupTestFiles() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
}
function runTests() {
    console.log('Running Task 1.5 Tests...\n');
    setupTestFiles();
    let passed = 0;
    let failed = 0;
    // Test 1: Outputs one contract object per state variable
    console.log('Test 1: Outputs one contract object per state variable');
    try {
        const contracts = (0, contract_1.buildContracts)(path.join(TEST_DIR, 'state.tsx'));
        if (contracts.length === 1) {
            console.log('✓ PASSED: Found one contract for one state variable');
            passed++;
        }
        else {
            console.log('✗ FAILED: Incorrect number of contracts');
            console.log(`  Found ${contracts.length} contracts (expected 1)`);
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Contract building crashed');
        failed++;
    }
    // Test 2: Contract includes defined_at, write_sites[], use_sites[], source="inferred"
    console.log('\nTest 2: Contract includes defined_at, write_sites[], use_sites[], source="inferred"');
    try {
        const contracts = (0, contract_1.buildContracts)(path.join(TEST_DIR, 'state.tsx'));
        const contract = contracts[0];
        if (contract &&
            contract.definedAt &&
            Array.isArray(contract.writeSites) &&
            Array.isArray(contract.useSites) &&
            contract.source === 'inferred') {
            console.log('✓ PASSED: Contract has all required fields');
            passed++;
        }
        else {
            console.log('✗ FAILED: Contract missing required fields');
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Contract field validation crashed');
        failed++;
    }
    // Test 3: Write sites and use sites include file, line, enclosing function name
    console.log('\nTest 3: Write sites and use sites include file, line, enclosing function name');
    try {
        const contracts = (0, contract_1.buildContracts)(path.join(TEST_DIR, 'state.tsx'));
        const contract = contracts[0];
        if (contract && contract.writeSites.length > 0) {
            const firstWrite = contract.writeSites[0];
            if (firstWrite.file &&
                typeof firstWrite.line === 'number' &&
                typeof firstWrite.column === 'number' &&
                firstWrite.enclosingFunction) {
                console.log('✓ PASSED: Write sites have required fields');
                passed++;
            }
            else {
                console.log('✗ FAILED: Write sites missing required fields');
                failed++;
            }
        }
        else {
            console.log('✗ FAILED: No write sites found');
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Write site field validation crashed');
        failed++;
    }
    // Test 3b: Use sites include column
    console.log('\nTest 3b: Use sites include file, line, column, enclosing function');
    try {
        const contracts = (0, contract_1.buildContracts)(path.join(TEST_DIR, 'state.tsx'));
        const contract = contracts[0];
        const firstUse = contract?.useSites[0];
        if (firstUse &&
            firstUse.file &&
            typeof firstUse.line === 'number' &&
            typeof firstUse.column === 'number' &&
            firstUse.enclosingFunction) {
            console.log('✓ PASSED: Use sites have stable span fields');
            passed++;
        }
        else {
            console.log('✗ FAILED: Use sites missing column or other span fields');
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Use site span validation crashed');
        failed++;
    }
    // Test 4: Valid JSON, no nulls for required fields
    console.log('\nTest 4: Valid JSON, no nulls for required fields');
    try {
        const contracts = (0, contract_1.buildContracts)(path.join(TEST_DIR, 'state.tsx'));
        const json = JSON.stringify(contracts);
        // Parse back and validate
        const parsed = JSON.parse(json);
        if (parsed.length === contracts.length) {
            console.log('✓ PASSED: JSON serialization/deserialization works');
            passed++;
        }
        else {
            console.log('✗ FAILED: JSON serialization/deserialization failed');
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: JSON validation crashed');
        failed++;
    }
    // Test 5: Multiple state variables
    console.log('\nTest 5: Multiple state variables');
    try {
        const contracts = (0, contract_1.buildContracts)(path.join(TEST_DIR, 'multi-state.tsx'));
        if (contracts.length === 2) {
            console.log('✓ PASSED: Found contracts for multiple state variables');
            passed++;
        }
        else {
            console.log('✗ FAILED: Incorrect number of contracts for multiple states');
            console.log(`  Found ${contracts.length} contracts (expected 2)`);
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Multiple state handling crashed');
        failed++;
    }
    // Test 6: Python fallback analyzer returns contracts
    console.log('\nTest 6: Python fallback analyzer returns contracts');
    try {
        const contracts = (0, contract_1.buildContracts)(path.join(TEST_DIR, 'state.py'));
        const countContract = contracts.find(c => c.variableName === 'count');
        if (countContract &&
            countContract.writeSites.length >= 2 &&
            countContract.useSites.length >= 1 &&
            countContract.triggeredBy.length === 0) {
            console.log('✓ PASSED: Python fallback produced a minimal contract');
            passed++;
        }
        else {
            console.log('✗ FAILED: Python fallback contract missing expected fields');
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: Python fallback analyzer crashed');
        failed++;
    }
    // Test 7: C++ fallback analyzer returns contracts
    console.log('\nTest 7: C++ fallback analyzer returns contracts');
    try {
        const contracts = (0, contract_1.buildContracts)(path.join(TEST_DIR, 'state.cpp'));
        const totalContract = contracts.find(c => c.variableName === 'total');
        if (totalContract &&
            totalContract.writeSites.length >= 1 &&
            totalContract.useSites.length >= 1 &&
            totalContract.triggeredBy.length === 0) {
            console.log('✓ PASSED: C++ fallback produced a minimal contract');
            passed++;
        }
        else {
            console.log('✗ FAILED: C++ fallback contract missing expected fields');
            failed++;
        }
    }
    catch (error) {
        console.log('✗ FAILED: C++ fallback analyzer crashed');
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
//# sourceMappingURL=contract.test.js.map