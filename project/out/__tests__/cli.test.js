"use strict";
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
const child_process_1 = require("child_process");
const temp_dir_1 = require("./temp-dir");
const contract_1 = require("../analysis/contract");
let TEST_DIR = '';
function setupTestFiles() {
    TEST_DIR = (0, temp_dir_1.createTempDir)('cli');
    // React component with multiple states and triggers
    const reactCode = `
import { useState } from 'react';

export function Cart() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  function addItem(item) {
    setItems([...items, item]); // write site for items
  }

  function clearCart() {
    setItems([]); // write site for items
    setTotal(0); // write site for total
  }

  return (
    <div>
      <button id="add-btn" onClick={addItem}>Add</button>
      <button id="clear-btn" onClick={clearCart}>Clear</button>
      <button id="inline-btn" onClick={() => setTotal(t => t + 10)}>Add 10</button>
    </div>
  );
}
`;
    fs.writeFileSync(path.join(TEST_DIR, 'Cart.tsx'), reactCode);
}
function cleanupTestFiles() {
    (0, temp_dir_1.removeTempDir)(TEST_DIR);
    TEST_DIR = '';
}
function runTests() {
    console.log('Running CLI & Trigger Analysis Tests...\n');
    setupTestFiles();
    let passed = 0;
    let failed = 0;
    const assert = (name, condition) => {
        if (condition) {
            console.log(`✓ PASSED: ${name}`);
            passed++;
        }
        else {
            console.log(`✗ FAILED: ${name}`);
            failed++;
        }
    };
    const cartPath = path.join(TEST_DIR, 'Cart.tsx');
    // Test 1: triggeredBy static extraction
    console.log('Test 1: triggeredBy static extraction');
    try {
        const contracts = (0, contract_1.buildContracts)(cartPath);
        const itemsContract = contracts.find(c => c.variableName === 'items');
        const totalContract = contracts.find(c => c.variableName === 'total');
        assert('Found items contract', !!itemsContract);
        assert('Found total contract', !!totalContract);
        if (itemsContract) {
            assert('items has two onClick trigger sources', itemsContract.triggeredBy.filter(t => t.event === 'onClick').length === 2);
        }
        if (totalContract) {
            assert('total has two onClick trigger sources', totalContract.triggeredBy.filter(t => t.event === 'onClick').length === 2);
        }
    }
    catch (error) {
        console.log('✗ FAILED: triggeredBy static extraction crashed:', error);
        failed++;
    }
    // Test 2: CLI stdout output
    console.log('\nTest 2: CLI stdout output');
    try {
        const cliPath = path.resolve(__dirname, '../cli.js');
        const stdout = (0, child_process_1.execSync)(`node "${cliPath}" analyze "${cartPath}"`, { encoding: 'utf-8' });
        const output = JSON.parse(stdout);
        assert('CLI output is an array', Array.isArray(output));
        assert('CLI array has 2 contracts', output.length === 2);
        const itemsOut = output.find((o) => o.state === 'items');
        assert('CLI output has write_sites, use_sites, triggered_by', !!itemsOut &&
            Array.isArray(itemsOut.write_sites) &&
            Array.isArray(itemsOut.triggered_by));
        if (itemsOut) {
            assert('items write_sites lists correct line', itemsOut.write_sites.some((ws) => ws.line === 9 || ws.line === 13));
            assert('items triggered_by lists correct line', itemsOut.triggered_by.some((tb) => tb.line === 20 || tb.line === 21));
        }
    }
    catch (error) {
        console.log('✗ FAILED: CLI execution crashed:', error);
        failed++;
    }
    // Test 3: CLI variable filter keeps stable JSON shape
    console.log('\nTest 3: CLI variable filter keeps stable JSON shape');
    try {
        const cliPath = path.resolve(__dirname, '../cli.js');
        const stdout = (0, child_process_1.execSync)(`node "${cliPath}" analyze "${cartPath}" --variable total`, { encoding: 'utf-8' });
        const output = JSON.parse(stdout);
        assert('Filtered CLI output is still an array', Array.isArray(output));
        assert('Filtered CLI output contains exactly one contract', output.length === 1);
        assert('Filtered CLI output contains only total', output[0]?.state === 'total');
    }
    catch (error) {
        console.log('✗ FAILED: CLI variable filter crashed:', error);
        failed++;
    }
    cleanupTestFiles();
    console.log(`\n=== CLI Test Results: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    const success = runTests();
    process.exit(success ? 0 : 1);
}
//# sourceMappingURL=cli.test.js.map