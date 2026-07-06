"use strict";
/**
 * Tests for Projection Slice (Def-Use View).
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
const temp_dir_1 = require("../../__tests__/temp-dir");
const def_use_slice_1 = require("../def-use-slice");
const contract_1 = require("../../analysis/contract");
const span_1 = require("../../analysis/span");
let TEST_DIR = '';
function setup() {
    TEST_DIR = (0, temp_dir_1.createTempDir)('projection-slice');
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
    (0, temp_dir_1.removeTempDir)(TEST_DIR);
    TEST_DIR = '';
}
function runTests() {
    console.log('Running Projection Slice Tests...\n');
    setup();
    let passed = 0;
    let failed = 0;
    const filePath = path.join(TEST_DIR, 'slice.tsx');
    console.log('Test 1: buildDefUseSlice returns def-use slice for state name');
    try {
        const slice = (0, def_use_slice_1.buildDefUseSlice)(filePath, 'count');
        if (slice && slice.viewType === 'def-use' && slice.scopeId === 'count' && slice.spans.length > 0) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED: crashed');
        failed++;
    }
    console.log('\nTest 2: all spans have stable file, line, column, enclosingFunction');
    try {
        const slice = (0, def_use_slice_1.buildDefUseSlice)(filePath, 'count');
        const allValid = slice?.spans.every(span_1.isValidSpan) ?? false;
        if (allValid) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED: crashed');
        failed++;
    }
    console.log('\nTest 3: slice includes write and use kinds');
    try {
        const slice = (0, def_use_slice_1.buildDefUseSlice)(filePath, 'count');
        const kinds = new Set(slice?.spans.map(s => s.kind));
        if (kinds.has('write') && kinds.has('use')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED: crashed');
        failed++;
    }
    console.log('\nTest 4: null when state not found');
    try {
        const slice = (0, def_use_slice_1.buildDefUseSlice)(filePath, 'missing');
        if (slice === null) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED: crashed');
        failed++;
    }
    console.log('\nTest 5: contractToSpans deterministic for same contract');
    try {
        const contracts = (0, contract_1.buildContracts)(filePath);
        const a = (0, def_use_slice_1.contractToSpans)(contracts[0], filePath);
        const b = (0, def_use_slice_1.contractToSpans)(contracts[0], filePath);
        if (JSON.stringify(a) === JSON.stringify(b)) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
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
//# sourceMappingURL=projection-slice.test.js.map