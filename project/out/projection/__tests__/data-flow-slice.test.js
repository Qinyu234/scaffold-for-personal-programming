"use strict";
/**
 * Tests for Data Flow View (Python) — DESIGN.md Phase 1.
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
const data_flow_slice_1 = require("../data-flow-slice");
const graph_1 = require("../graph");
const layout_1 = require("../../virtual/layout");
const session_1 = require("../../virtual/session");
const push_1 = require("../../virtual/push");
const data_type_1 = require("../../analysis/data-type");
const python_contract_1 = require("../../analysis/python-contract");
const FIX = path.join(__dirname, 'fixtures');
function setup() {
    fs.mkdirSync(FIX, { recursive: true });
    fs.writeFileSync(path.join(FIX, 'flow.py'), `cart_total: int = 0

def add_item(price: float):
    global cart_total
    cart_total += price

def show_total():
    return cart_total

label = "cart"
`);
}
function cleanup() {
    if (fs.existsSync(FIX)) {
        fs.rmSync(FIX, { recursive: true, force: true });
    }
}
function runTests() {
    console.log('Running Data Flow Slice Tests...\n');
    setup();
    let passed = 0;
    let failed = 0;
    const filePath = path.join(FIX, 'flow.py');
    console.log('Test 1: infer int64 from Python int hint');
    try {
        const contracts = (0, python_contract_1.buildPythonContracts)(filePath);
        const cart = contracts.find(c => c.variableName === 'cart_total');
        const dt = cart ? (0, data_type_1.inferPythonDataType)(filePath, cart) : null;
        if (dt && dt.interpretation === 'int64' && dt.length === 'fixed') {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', dt);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 2: infer string (unsized) from literal');
    try {
        const contracts = (0, python_contract_1.buildPythonContracts)(filePath);
        const label = contracts.find(c => c.variableName === 'label');
        const dt = label ? (0, data_type_1.inferPythonDataType)(filePath, label) : null;
        if (dt && dt.interpretation === 'string' && dt.length === 'unsized') {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', dt);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 3: buildDataFlowSlice returns typed slice');
    try {
        const slice = (0, data_flow_slice_1.buildDataFlowSlice)(filePath, 'cart_total');
        if (slice && slice.viewType === 'data-flow' && slice.dataType.label === 'int64' && slice.spans.length > 0) {
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
    console.log('\nTest 4: graph has type→data interpret edge');
    try {
        const slice = (0, data_flow_slice_1.buildDataFlowSlice)(filePath, 'cart_total');
        const graph = (0, graph_1.graphFromDataFlowSlice)(slice);
        const interpret = graph.edges.find(e => e.label === 'interpret');
        const hasType = graph.nodes.some(n => n.kind === 'data' && n.id.startsWith('type:'));
        if (interpret && hasType) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', graph);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 5: layout includes type header and write/use sections');
    try {
        const slice = (0, data_flow_slice_1.buildDataFlowSlice)(filePath, 'cart_total');
        const doc = (0, layout_1.layoutDataFlowDocument)(slice, filePath, new Set());
        if (doc.text.includes('data-flow view: cart_total') &&
            doc.text.includes('type: int64') &&
            doc.text.includes('write sites') &&
            doc.text.includes('read sites')) {
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
    console.log('\nTest 6: session + push overlay updates source line');
    try {
        const session = (0, session_1.createDataFlowSession)(filePath, 'cart_total', FIX);
        const seg = session.document.segments.find(s => s.kind === 'write');
        if (!seg) {
            throw new Error('no write segment');
        }
        session.selectedSegmentIds = new Set([seg.id]);
        const lines = session.document.text.split(/\r?\n/);
        const idx = seg.virtualStartLine - 1;
        lines[idx] = '    cart_total += price * 2';
        (0, push_1.pushOverlay)(session, lines.join('\n'), 'selected');
        const updated = fs.readFileSync(filePath, 'utf8');
        if (updated.includes('cart_total += price * 2')) {
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
    console.log('\nTest 7: listPythonDataNames returns data variables');
    try {
        const names = (0, data_flow_slice_1.listPythonDataNames)(filePath);
        if (names.includes('cart_total') && names.includes('label')) {
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
    console.log(`\n=== Data Flow Slice Tests: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    process.exit(runTests() ? 0 : 1);
}
//# sourceMappingURL=data-flow-slice.test.js.map