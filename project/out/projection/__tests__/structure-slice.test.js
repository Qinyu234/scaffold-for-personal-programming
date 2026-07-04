"use strict";
/**
 * Tests for Structure View — DESIGN.md Phase 1.
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
const structure_slice_1 = require("../structure-slice");
const graph_1 = require("../graph");
const layout_1 = require("../../virtual/layout");
const session_1 = require("../../virtual/session");
const FIX = path.join(__dirname, 'fixtures');
function setup() {
    fs.mkdirSync(FIX, { recursive: true });
    fs.writeFileSync(path.join(FIX, 'module.tsx'), `import { useState } from 'react';
import path from 'path';

export function Module() {
  const [x, setX] = useState(0);
  return x;
}
`);
    fs.writeFileSync(path.join(FIX, 'sample.py'), `import os
from collections import Counter

total = 0
`);
}
function cleanup() {
    if (fs.existsSync(FIX)) {
        fs.rmSync(FIX, { recursive: true, force: true });
    }
}
function runTests() {
    console.log('Running Structure Slice Tests...\n');
    setup();
    let passed = 0;
    let failed = 0;
    const tsPath = path.join(FIX, 'module.tsx');
    const pyPath = path.join(FIX, 'sample.py');
    console.log('Test 1: TS structure slice captures react import');
    try {
        const slice = (0, structure_slice_1.buildStructureSlice)(tsPath);
        if (slice && slice.spans.some(s => s.variableName === 'react')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED');
        failed++;
    }
    console.log('\nTest 2: graph has imports edge');
    try {
        const graph = (0, graph_1.graphFromStructureSlice)((0, structure_slice_1.buildStructureSlice)(tsPath));
        if (graph.edges.some(e => e.label === 'imports')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED');
        failed++;
    }
    console.log('\nTest 3: layout lists module imports');
    try {
        const doc = (0, layout_1.layoutStructureDocument)((0, structure_slice_1.buildStructureSlice)(tsPath), tsPath, new Set());
        if (doc.text.includes('structure view: module') && doc.text.includes('imports')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED');
        failed++;
    }
    console.log('\nTest 4: Python structure slice captures from-import');
    try {
        const slice = (0, structure_slice_1.buildStructureSlice)(pyPath);
        if (slice && slice.spans.some(s => s.variableName === 'collections')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED');
        failed++;
    }
    console.log('\nTest 5: session uses lucid://view/structure URI');
    try {
        const session = (0, session_1.createStructureSession)(tsPath, FIX);
        if (session.lineage.virtualUri.startsWith('lucid://view/structure/module')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED');
        failed++;
    }
    cleanup();
    console.log(`\n=== Structure Slice Tests: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    process.exit(runTests() ? 0 : 1);
}
//# sourceMappingURL=structure-slice.test.js.map