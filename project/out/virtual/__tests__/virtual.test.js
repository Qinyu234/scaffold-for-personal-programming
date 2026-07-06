"use strict";
/**
 * Tests: virtual layout, pull/push round-trip, fork.
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
const layout_1 = require("../layout");
const def_use_slice_1 = require("../../projection/def-use-slice");
const session_1 = require("../session");
const push_1 = require("../push");
const fork_1 = require("../fork");
const extract_1 = require("../extract");
const fold_store_1 = require("../fold-store");
let FIX = '';
let WS = '';
function setup() {
    FIX = (0, temp_dir_1.createTempDir)('virtual');
    WS = path.join(FIX, 'ws');
    fs.mkdirSync(WS, { recursive: true });
    const src = `function demo() {
  let count = 0;
  function bump() {
    count += 1;
  }
  function read() {
    return count;
  }
  return { bump, read };
}
`;
    fs.writeFileSync(path.join(FIX, 'push.ts'), src);
}
function cleanup() {
    (0, temp_dir_1.removeTempDir)(FIX);
    FIX = '';
    WS = '';
}
function runTests() {
    console.log('Running Virtual Layer Tests...\n');
    setup();
    let passed = 0;
    let failed = 0;
    const filePath = path.join(FIX, 'push.ts');
    console.log('Test 1: layout produces segments and display headers');
    try {
        const slice = (0, def_use_slice_1.buildDefUseSlice)(filePath, 'count');
        const doc = (0, layout_1.layoutDefUseDocument)(slice, filePath, new Set());
        if (doc.text.includes('// ---') && doc.segments.length > 0) {
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
    console.log('\nTest 2: fold collapses function region');
    try {
        const slice = (0, def_use_slice_1.buildDefUseSlice)(filePath, 'count');
        const doc = (0, layout_1.layoutDefUseDocument)(slice, filePath, new Set(['bump']));
        const collapsed = doc.segments.some(s => s.enclosingFunction === 'bump' && s.collapsed);
        if (collapsed && doc.text.includes('[collapsed]')) {
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
    console.log('\nTest 3: push overlay round-trip (save_selected)');
    try {
        const fresh = `function demo() {
  let count = 0;
  function bump() {
    count += 1;
  }
  return count;
}
`;
        fs.writeFileSync(filePath, fresh);
        let session = (0, session_1.createDefUseSession)(filePath, 'count', WS);
        const writeSeg = session.document.segments.find(s => s.kind === 'write' && !s.collapsed);
        if (!writeSeg) {
            throw new Error('no write segment');
        }
        const lines = session.document.text.split(/\r?\n/);
        lines[writeSeg.virtualStartLine - 1] = '    count += 2;';
        const edited = lines.join('\n');
        session = { ...session, selectedSegmentIds: new Set([writeSeg.id]) };
        const result = (0, push_1.pushOverlay)(session, edited, 'selected');
        const source = (0, extract_1.readSourceLines)(filePath);
        const line = source[writeSeg.sourceLine - 1];
        if (result.updatedLines === 1 && line.includes('count += 2')) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', line, result);
            failed++;
        }
    }
    catch (e) {
        console.log('✗ FAILED', e);
        failed++;
    }
    console.log('\nTest 4: pull rebuilds after external change');
    try {
        const session = (0, session_1.createDefUseSession)(filePath, 'count', WS);
        const pulled = (0, session_1.pullSession)(session, WS);
        if (pulled.document.text.length > 0) {
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
    console.log('\nTest 5: fork function same file (fooPrime)');
    try {
        const forkFile = path.join(FIX, 'fork.ts');
        fs.writeFileSync(forkFile, `function shared() { return 1; }\nfunction consumer() { return shared(); }\n`);
        const newName = (0, fork_1.suggestForkName)('shared', 'function');
        const result = (0, fork_1.forkFunctionInFile)(forkFile, 'shared', newName);
        const text = fs.readFileSync(forkFile, 'utf8');
        if (result && newName === 'sharedPrime' && text.includes(`function ${newName}`)) {
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
    console.log('\nTest 6: fold state persists under .lucid/state/{stateName}/');
    try {
        (0, fold_store_1.saveFoldState)(WS, 'count', new Set(['bump']));
        const p = path.join(WS, '.lucid', 'state', 'count', 'fold.json');
        if (fs.existsSync(p)) {
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
    console.log(`\n=== Virtual Layer Tests: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    process.exit(runTests() ? 0 : 1);
}
//# sourceMappingURL=virtual.test.js.map