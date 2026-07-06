"use strict";
/**
 * Tests for Impact View — DESIGN.md Phase 1.
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
const impact_slice_1 = require("../impact-slice");
const graph_1 = require("../graph");
const layout_1 = require("../../virtual/layout");
const session_1 = require("../../virtual/session");
const push_1 = require("../../virtual/push");
let FIX = '';
function setup() {
    FIX = (0, temp_dir_1.createTempDir)('impact');
    fs.writeFileSync(path.join(FIX, 'impact.tsx'), `import { useState } from 'react';

export function Panel() {
  const [count, setCount] = useState(0);
  function show() { return count; }
  function bump() { setCount(c => c + 1); }
  return <span onClick={bump}>{show()}</span>;
}
`);
}
function cleanup() {
    (0, temp_dir_1.removeTempDir)(FIX);
    FIX = '';
}
function runTests() {
    console.log('Running Impact Slice Tests...\n');
    setup();
    let passed = 0;
    let failed = 0;
    const filePath = path.join(FIX, 'impact.tsx');
    console.log('Test 1: listImpactStates includes count');
    try {
        if ((0, impact_slice_1.listImpactStates)(filePath).includes('count')) {
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
    console.log('\nTest 2: slice has write and use spans');
    try {
        const slice = (0, impact_slice_1.buildImpactSlice)(filePath, 'count');
        const kinds = new Set(slice?.spans.map(s => s.kind));
        if (slice && kinds.has('write') && kinds.has('use')) {
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
    console.log('\nTest 3: graph has affects edge');
    try {
        const slice = (0, impact_slice_1.buildImpactSlice)(filePath, 'count');
        const edge = (0, graph_1.graphFromImpactSlice)(slice).edges.find(e => e.label === 'affects');
        if (edge) {
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
    console.log('\nTest 4: layout lists downstream impact');
    try {
        const doc = (0, layout_1.layoutImpactDocument)((0, impact_slice_1.buildImpactSlice)(filePath, 'count'), filePath, new Set());
        if (doc.text.includes('downstream impact') && doc.text.includes('mutation sites')) {
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
    console.log('\nTest 5: push updates write line');
    try {
        const session = (0, session_1.createImpactSession)(filePath, 'count', FIX);
        const seg = session.document.segments.find(s => s.kind === 'write');
        if (!seg) {
            throw new Error('no write');
        }
        session.selectedSegmentIds = new Set([seg.id]);
        const lines = session.document.text.split(/\r?\n/);
        lines[seg.virtualStartLine - 1] = '  function bump() { setCount(c => c + 2); }';
        (0, push_1.pushOverlay)(session, lines.join('\n'), 'selected');
        if (fs.readFileSync(filePath, 'utf8').includes('c + 2')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED');
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    cleanup();
    console.log(`\n=== Impact Slice Tests: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    process.exit(runTests() ? 0 : 1);
}
//# sourceMappingURL=impact-slice.test.js.map