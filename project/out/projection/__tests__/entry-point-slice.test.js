"use strict";
/**
 * Tests for Entry Point View (JS/TS) — DESIGN.md Phase 1.
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
const entry_point_slice_1 = require("../entry-point-slice");
const graph_1 = require("../graph");
const layout_1 = require("../../virtual/layout");
const session_1 = require("../../virtual/session");
const push_1 = require("../../virtual/push");
let FIX = '';
function setup() {
    FIX = (0, temp_dir_1.createTempDir)('entry-point');
    fs.writeFileSync(path.join(FIX, 'entry.tsx'), `export function CartPanel() {
  function showTotal() {
    return cartTotal;
  }
  function showSpinner() {
    return isLoading ? '...' : null;
  }
  let cartTotal = 0;
  let isLoading = false;
  return (
    <div>
      <span>{showTotal()}</span>
      {showSpinner()}
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
    console.log('Running Entry Point Slice Tests...\n');
    setup();
    let passed = 0;
    let failed = 0;
    const filePath = path.join(FIX, 'entry.tsx');
    console.log('Test 1: listEntryPointFunctions finds nested functions');
    try {
        const names = (0, entry_point_slice_1.listEntryPointFunctions)(filePath);
        if (names.includes('CartPanel') && names.includes('showTotal') && names.includes('showSpinner')) {
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
    console.log('\nTest 2: call order from CartPanel entry');
    try {
        const slice = (0, entry_point_slice_1.buildEntryPointSlice)(filePath, 'CartPanel');
        if (slice &&
            slice.callOrder[0] === 'CartPanel' &&
            slice.callOrder.includes('showTotal') &&
            slice.callOrder.includes('showSpinner')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', slice?.callOrder);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 3: graph has call edges');
    try {
        const slice = (0, entry_point_slice_1.buildEntryPointSlice)(filePath, 'CartPanel');
        const graph = (0, graph_1.graphFromEntryPointSlice)(slice);
        const calls = graph.edges.filter(e => e.label === 'calls');
        if (calls.some(e => e.target.includes('showTotal'))) {
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
    console.log('\nTest 4: layout ordered by callOrder with function bodies');
    try {
        const slice = (0, entry_point_slice_1.buildEntryPointSlice)(filePath, 'CartPanel');
        const doc = (0, layout_1.layoutEntryPointDocument)(slice, filePath, new Set());
        if (doc.text.includes('entry-point view: CartPanel') &&
            doc.text.indexOf('CartPanel') < doc.text.indexOf('showTotal') &&
            doc.segments.some(s => (s.sourceEndLine ?? s.sourceLine) > s.sourceLine)) {
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
    console.log('\nTest 5: push overlay updates multi-line function body');
    try {
        const session = (0, session_1.createEntryPointSession)(filePath, 'showTotal', FIX);
        const seg = session.document.segments.find(s => s.enclosingFunction === 'showTotal');
        if (!seg) {
            throw new Error('no showTotal segment');
        }
        session.selectedSegmentIds = new Set([seg.id]);
        const lines = session.document.text.split(/\r?\n/);
        const start = seg.virtualStartLine - 1;
        const end = seg.virtualEndLine;
        const bodyLines = lines.slice(start, end);
        const retIdx = bodyLines.findIndex(l => l.includes('return'));
        if (retIdx >= 0) {
            bodyLines[retIdx] = '    return cartTotal + 1;';
        }
        lines.splice(start, end - start, ...bodyLines);
        (0, push_1.pushOverlay)(session, lines.join('\n'), 'selected');
        const updated = fs.readFileSync(filePath, 'utf8');
        if (updated.includes('return cartTotal + 1')) {
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
    console.log(`\n=== Entry Point Slice Tests: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    process.exit(runTests() ? 0 : 1);
}
//# sourceMappingURL=entry-point-slice.test.js.map