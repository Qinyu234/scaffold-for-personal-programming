"use strict";
/**
 * Tests for relative import resolution (tier-1 cluster).
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
const import_resolve_1 = require("../import-resolve");
const structure_slice_1 = require("../structure-slice");
let FIX = '';
function setup() {
    FIX = (0, temp_dir_1.createTempDir)('import-resolve');
    fs.mkdirSync(path.join(FIX, 'shared'), { recursive: true });
    fs.writeFileSync(path.join(FIX, 'shared', 'counter.ts'), 'export let n = 0;\n');
    fs.writeFileSync(path.join(FIX, 'main.ts'), `import { n } from './shared/counter';
export function run() { return n; }
`);
}
function cleanup() {
    (0, temp_dir_1.removeTempDir)(FIX);
    FIX = '';
}
function runTests() {
    console.log('Running Import Resolve Tests...\n');
    setup();
    let passed = 0;
    let failed = 0;
    const main = path.join(FIX, 'main.ts');
    const counter = path.join(FIX, 'shared', 'counter.ts');
    console.log('Test 1: resolveImportPath finds local file');
    try {
        const resolved = (0, import_resolve_1.resolveImportPath)(main, './shared/counter');
        if (resolved === path.normalize(counter)) {
            console.log('✓ PASSED');
            passed++;
        }
        else {
            console.log('✗ FAILED', resolved);
            failed++;
        }
    }
    catch {
        console.log('✗ FAILED');
        failed++;
    }
    console.log('\nTest 2: package import returns null');
    try {
        if ((0, import_resolve_1.resolveImportPath)(main, 'react') === null) {
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
    console.log('\nTest 3: structure slice lists resolved member');
    try {
        const slice = (0, structure_slice_1.buildStructureSlice)(main);
        const member = slice.members.find(m => m.specifier === './shared/counter');
        if (slice.focalFilePath === path.normalize(main) && member?.filePath === path.normalize(counter)) {
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
    console.log(`\n=== Import Resolve Tests: ${passed} passed, ${failed} failed ===`);
    return failed === 0;
}
if (require.main === module) {
    process.exit(runTests() ? 0 : 1);
}
//# sourceMappingURL=import-resolve.test.js.map