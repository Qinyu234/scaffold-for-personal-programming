"use strict";
/**
 * Resolve relative import specifiers to workspace file paths (1-hop cluster).
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
exports.isRelativeSpecifier = isRelativeSpecifier;
exports.resolveImportPath = resolveImportPath;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TRY_SUFFIXES = [
    '',
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '/index.ts',
    '/index.tsx',
    '/index.js',
];
function isRelativeSpecifier(specifier) {
    return specifier.startsWith('.') || specifier.startsWith('/');
}
/** Returns absolute path when a local file exists; null for packages / unresolved. */
function resolveImportPath(fromFile, specifier) {
    if (!isRelativeSpecifier(specifier)) {
        return null;
    }
    const base = path.dirname(path.resolve(fromFile));
    const raw = path.resolve(base, specifier);
    for (const suffix of TRY_SUFFIXES) {
        const candidate = raw + suffix;
        try {
            if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                return path.normalize(candidate);
            }
        }
        catch {
            // skip
        }
    }
    return null;
}
//# sourceMappingURL=import-resolve.js.map