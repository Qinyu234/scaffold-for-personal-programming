"use strict";
/**
 * Tests for Event Flow View (JS/TS) — DESIGN.md Phase 1.
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
const event_flow_slice_1 = require("../event-flow-slice");
const graph_1 = require("../graph");
const layout_1 = require("../../virtual/layout");
const session_1 = require("../../virtual/session");
const push_1 = require("../../virtual/push");
let FIX = '';
function setup() {
    FIX = (0, temp_dir_1.createTempDir)('event-flow');
    fs.writeFileSync(path.join(FIX, 'events.tsx'), `import { useState } from 'react';

export function Cart() {
  const [total, setTotal] = useState(0);

  function addTen() {
    setTotal(t => t + 10);
  }

  return (
    <div>
      <button onClick={addTen}>Add 10</button>
      <button onClick={() => setTotal(t => t + 1)}>Add 1</button>
    </div>
  );
}
`);
}
function cleanup() {
    (0, temp_dir_1.removeTempDir)(FIX);
    FIX = '';
}
function runTests() {
    console.log('Running Event Flow Slice Tests...\n');
    setup();
    let passed = 0;
    let failed = 0;
    const filePath = path.join(FIX, 'events.tsx');
    console.log('Test 1: statesWithTriggers finds total');
    try {
        const names = (0, event_flow_slice_1.statesWithTriggers)(filePath);
        if (names.includes('total')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', names);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 2: slice includes trigger and write kinds');
    try {
        const slice = (0, event_flow_slice_1.buildEventFlowSlice)(filePath, 'total');
        const kinds = new Set(slice?.spans.map(s => s.kind));
        if (slice && kinds.has('trigger') && kinds.has('write')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', kinds);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 3: graph has trigger→state edge');
    try {
        const slice = (0, event_flow_slice_1.buildEventFlowSlice)(filePath, 'total');
        const graph = (0, graph_1.graphFromEventFlowSlice)(slice);
        const toState = graph.edges.find(e => e.target.includes('state:total') && e.source.startsWith('trigger:'));
        if (toState) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', graph.edges);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 4: layout lists event triggers before writes');
    try {
        const slice = (0, event_flow_slice_1.buildEventFlowSlice)(filePath, 'total');
        const doc = (0, layout_1.layoutEventFlowDocument)(slice, filePath, new Set());
        const tri = doc.text.indexOf('event triggers');
        const wr = doc.text.indexOf('state writes');
        if (doc.text.includes('event-flow view: total') && tri >= 0 && wr > tri) {
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
    console.log('\nTest 5: push overlay updates inline handler line');
    try {
        const session = (0, session_1.createEventFlowSession)(filePath, 'total', FIX);
        const seg = session.document.segments.find(s => s.kind === 'write');
        if (!seg) {
            throw new Error('no write segment');
        }
        session.selectedSegmentIds = new Set([seg.id]);
        const lines = session.document.text.split(/\r?\n/);
        const idx = seg.virtualStartLine - 1;
        lines[idx] = '      <button onClick={() => setTotal(t => t + 2)}>Add 2</button>';
        (0, push_1.pushOverlay)(session, lines.join('\n'), 'selected');
        const updated = fs.readFileSync(filePath, 'utf8');
        if (updated.includes('t + 2')) {
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
    console.log('\nTest 6: listEventFlowStates includes total');
    try {
        const names = (0, event_flow_slice_1.listEventFlowStates)(filePath);
        if (names.includes('total')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', names);
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED');
        failed++;
    }
    cleanup();
    console.log(`\n=== Event Flow Slice Tests: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    process.exit(runTests() ? 0 : 1);
}
//# sourceMappingURL=event-flow-slice.test.js.map