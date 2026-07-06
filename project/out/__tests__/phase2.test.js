"use strict";
/**
 * Phase 2 tests: cross-file def-use, trace overlay, translation scaffold.
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
const def_use_slice_1 = require("../projection/def-use-slice");
const layout_1 = require("../virtual/layout");
const trace_overlay_1 = require("../analysis/trace-overlay");
const translation_1 = require("../virtual/translation");
const push_1 = require("../virtual/push");
const session_1 = require("../virtual/session");
let FIX = '';
function setupCrossFile() {
    FIX = (0, temp_dir_1.createTempDir)('phase2');
    fs.mkdirSync(path.join(FIX, 'shared'), { recursive: true });
    fs.writeFileSync(path.join(FIX, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { target: 'ES2020', module: 'ESNext', strict: false, moduleResolution: 'node' },
        include: ['**/*.ts'],
    }, null, 2));
    fs.writeFileSync(path.join(FIX, 'shared', 'counter.ts'), `export let total = 0;
export function inc() {
  total += 1;
}
`);
    fs.writeFileSync(path.join(FIX, 'main.ts'), `import { total, inc } from './shared/counter';

export function run() {
  inc();
  console.log(total);
}
`);
}
function cleanup() {
    (0, temp_dir_1.removeTempDir)(FIX);
    FIX = '';
}
function runTests() {
    console.log('Running Phase 2 Tests...\n');
    setupCrossFile();
    let passed = 0;
    let failed = 0;
    const mainFile = path.join(FIX, 'main.ts');
    const counterFile = path.join(FIX, 'shared', 'counter.ts');
    console.log('Test 1: cross-file slice includes use site in consumer file');
    try {
        const slice = (0, def_use_slice_1.buildDefUseSliceWorkspace)(counterFile, 'total', FIX);
        const files = new Set(slice?.spans.filter((s) => s.kind === 'use').map((s) => s.file));
        if (slice && files.has(mainFile) && files.has(counterFile)) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', { files: [...files] });
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 2: multi-file layout renders both file sections');
    try {
        const slice = (0, def_use_slice_1.buildDefUseSliceWorkspace)(counterFile, 'total', FIX);
        const doc = (0, layout_1.layoutDefUseDocument)(slice, counterFile, new Set());
        if (doc.text.includes('shared/counter') && doc.segments.some((s) => s.sourceFile === counterFile)) {
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
    console.log('\nTest 3: trace overlay marks observed spans');
    try {
        const slice = (0, def_use_slice_1.buildDefUseSliceWorkspace)(counterFile, 'total', FIX);
        const merged = (0, trace_overlay_1.mergeTraceOverlay)(slice, [
            { file: mainFile, line: 5, kind: 'use', variableName: 'total' },
        ]);
        const observed = merged.spans.find((s) => s.provenance === 'observed');
        if (observed) {
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
    console.log('\nTest 4: translation session uses lucid://translation URI');
    try {
        const py = path.join(FIX, 'sample.py');
        fs.writeFileSync(py, 'total = 0\n');
        const session = (0, translation_1.createTranslationSession)({ sourceFile: py, scopeId: 'total', targetLang: 'cpp' }, FIX);
        if (session.lineage.virtualUri.startsWith('lucid://translation/cpp/') &&
            session.document.text.includes('Python → C++')) {
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
    console.log('\nTest 5: cross-file push updates remote file line');
    try {
        const session = (0, session_1.createDefUseSession)(counterFile, 'total', FIX);
        const seg = session.document.segments.find((s) => s.sourceFile === counterFile && s.kind === 'write');
        if (!seg) {
            throw new Error('no write segment in counter');
        }
        session.selectedSegmentIds = new Set([seg.id]);
        const lines = session.document.text.split(/\r?\n/);
        const idx = seg.virtualStartLine - 1;
        lines[idx] = '  total += 2;';
        const result = (0, push_1.pushOverlay)(session, lines.join('\n'), 'selected');
        const counterText = fs.readFileSync(counterFile, 'utf8');
        if (result.updatedFiles.includes(counterFile) && counterText.includes('total += 2')) {
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
    console.log(`\n=== Phase 2 Tests: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    process.exit(runTests() ? 0 : 1);
}
//# sourceMappingURL=phase2.test.js.map