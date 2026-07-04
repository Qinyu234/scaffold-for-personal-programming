#!/usr/bin/env node
"use strict";
/**
 * Lucid CLI Tool — pure CLI for def-use contract analysis.
 *
 * Usage:
 *   node out/cli.js analyze <file_path> [--variable <state_name>]
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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const analyze_1 = require("./core/analyze");
function showUsage() {
    console.log('Lucid Code Observatory CLI');
    console.log('Usage:');
    console.log('  node out/cli.js analyze <file_path> [--variable <state_name>]');
    process.exit(1);
}
function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        showUsage();
    }
    const command = args[0];
    if (command !== 'analyze') {
        console.error(`Unknown command: ${command}`);
        showUsage();
    }
    const fileArg = args[1];
    if (!fileArg) {
        console.error('Missing file path.');
        showUsage();
    }
    const filePath = path.resolve(fileArg);
    if (!fs.existsSync(filePath)) {
        console.error(`File not found: ${filePath}`);
        process.exit(1);
    }
    // Parse --variable argument
    let targetVariable;
    const varIndex = args.indexOf('--variable');
    if (varIndex !== -1 && varIndex + 1 < args.length) {
        targetVariable = args[varIndex + 1];
    }
    try {
        const contracts = (0, analyze_1.analyzeFile)(filePath, targetVariable);
        const formatted = contracts.map(c => ({
            state: c.variableName,
            write_sites: c.writeSites.map(ws => ({
                function: ws.enclosingFunction,
                line: ws.line,
            })),
            use_sites: c.useSites.map(us => ({
                function: us.enclosingFunction,
                line: us.line,
            })),
            triggered_by: c.triggeredBy.map(tb => ({
                event: tb.event,
                line: tb.line,
            })),
        }));
        if (formatted.length === 0) {
            console.log(JSON.stringify([], null, 2));
        }
        else if (formatted.length === 1 && !targetVariable) {
            console.log(JSON.stringify(formatted[0], null, 2));
        }
        else {
            console.log(JSON.stringify(formatted, null, 2));
        }
    }
    catch (error) {
        console.error('Analysis failed:', error);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
//# sourceMappingURL=cli.js.map