"use strict";
/**
 * Phase 2 UI wiring tests: trace JSON, translation URI, def-use pull + trace.
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
const temp_dir_1 = require("./temp-dir");
const trace_session_1 = require("../virtual/trace-session");
const trace_apply_1 = require("../virtual/trace-apply");
const lucid_paths_1 = require("../extension/lucid-paths");
const session_1 = require("../virtual/session");
const translation_1 = require("../virtual/translation");
const session_store_1 = require("../extension/session-store");
let FIX = '';
function setup() {
    FIX = (0, temp_dir_1.createTempDir)('phase2-ui');
    fs.mkdirSync(path.join(FIX, 'shared'), { recursive: true });
    fs.writeFileSync(path.join(FIX, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { target: 'ES2020', module: 'ESNext', strict: false, moduleResolution: 'node' },
        include: ['**/*.ts'],
    }, null, 2));
    fs.writeFileSync(path.join(FIX, 'shared', 'counter.ts'), `export let total = 0;
export function inc() { total += 1; }
`);
    fs.writeFileSync(path.join(FIX, 'main.ts'), `import { total, inc } from './shared/counter';
export function run() { inc(); console.log(total); }
`);
}
function cleanup() {
    (0, temp_dir_1.removeTempDir)(FIX);
    FIX = '';
}
function runTests() {
    console.log('Running Phase 2 UI Tests...\n');
    setup();
    let passed = 0;
    let failed = 0;
    const counterFile = path.join(FIX, 'shared', 'counter.ts');
    const mainFile = path.join(FIX, 'main.ts');
    console.log('Test 1: parseTraceEventsJson');
    try {
        const events = (0, trace_session_1.parseTraceEventsJson)(JSON.stringify([{ file: mainFile, line: 2, kind: 'use', variableName: 'total' }]));
        if (events.length === 1 && events[0].variableName === 'total') {
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
    console.log('\nTest 2: translation sessionKey uses lucid://translation URI');
    try {
        const py = path.join(FIX, 'x.py');
        fs.writeFileSync(py, 'n = 1\n');
        const session = (0, translation_1.createTranslationSession)({ sourceFile: py, scopeId: 'n', targetLang: 'cpp' }, FIX);
        const key = (0, session_store_1.putSession)(session);
        if (key.startsWith('lucid://translation/cpp/n') && (0, session_store_1.getSession)(key)) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', key);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 3: pullSession refreshes cross-file def-use slice');
    try {
        const session = (0, session_1.createDefUseSession)(counterFile, 'total', FIX);
        const pulled = (0, session_1.pullSession)(session, FIX);
        const files = new Set(pulled.slice.spans.map(s => s.file));
        if (files.has(mainFile) && files.has(counterFile)) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', [...files]);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 4: applyTraceEvents marks observed in relayout');
    try {
        let session = (0, session_1.createDefUseSession)(counterFile, 'total', FIX);
        session = (0, trace_session_1.applyTraceEvents)(session, [
            { file: mainFile, line: 2, kind: 'use', variableName: 'total' },
        ]);
        session = (0, session_1.relayoutSession)(session, FIX);
        const observed = session.slice.spans.find(s => s.provenance === 'observed');
        if (observed && session.document.text.includes('[observed]')) {
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
    console.log('\nTest 5: traceJsonPath + applyTraceToSession from file');
    try {
        const traceFile = (0, lucid_paths_1.traceJsonPath)(FIX);
        fs.mkdirSync(path.dirname(traceFile), { recursive: true });
        fs.writeFileSync(traceFile, JSON.stringify([{ file: mainFile, line: 2, kind: 'use', variableName: 'total' }]));
        const events = (0, trace_session_1.parseTraceEventsJson)(fs.readFileSync(traceFile, 'utf8'));
        let session = (0, session_1.createDefUseSession)(counterFile, 'total', FIX);
        session = (0, trace_apply_1.applyTraceToSession)(session, events, FIX);
        if (traceFile.endsWith('.lucid\\trace.json') || traceFile.endsWith('.lucid/trace.json')) {
            if (session.traceEvents?.length === 1 && session.document.text.includes('[observed]')) {
                console.log('✓ PASSED');
                passed++;
            }
            else {
                console.log('✗ FAILED');
                failed++;
            }
        }
        else {
            console.log('✗ FAILED bad path', traceFile);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    cleanup();
    console.log(`\n=== Phase 2 UI Tests: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    process.exit(runTests() ? 0 : 1);
}
//# sourceMappingURL=phase2-ui.test.js.map