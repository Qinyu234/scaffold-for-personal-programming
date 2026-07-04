"use strict";
/**
 * Lucid data type model: (length, interpretation) per DESIGN.md.
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
exports.lucidType = lucidType;
exports.inferPythonDataType = inferPythonDataType;
const fs = __importStar(require("fs"));
const FIXED = {
    bool: { length: 'fixed', interpretation: 'bool', label: 'bool' },
    char: { length: 'fixed', interpretation: 'char', label: 'char' },
    int32: { length: 'fixed', interpretation: 'int32', label: 'int32' },
    int64: { length: 'fixed', interpretation: 'int64', label: 'int64' },
    double: { length: 'fixed', interpretation: 'double', label: 'double' },
    string: { length: 'unsized', interpretation: 'string', label: 'string' },
};
function lucidType(length, interpretation) {
    return { ...FIXED[interpretation], length };
}
function rhsFromDefineLine(line, name) {
    const hint = new RegExp(`\\b${name}\\s*:\\s*([A-Za-z_][\\w.]*)\\s*=`).exec(line);
    if (hint) {
        return hint[1];
    }
    const assign = new RegExp(`\\b${name}\\s*=\\s*(.+?)(?:\\s#|$)`).exec(line.trim());
    return assign?.[1]?.trim() ?? null;
}
function typeFromHint(hint) {
    const h = hint.toLowerCase();
    if (h === 'bool') {
        return lucidType('fixed', 'bool');
    }
    if (h === 'str' || h === 'string') {
        return lucidType('unsized', 'string');
    }
    if (h === 'float') {
        return lucidType('fixed', 'double');
    }
    if (h === 'int') {
        return lucidType('fixed', 'int64');
    }
    return lucidType('fixed', 'int64');
}
function typeFromRhs(rhs) {
    const v = rhs.trim();
    if (/^["']/.test(v)) {
        return lucidType('unsized', 'string');
    }
    if (/^(True|False)\b/.test(v)) {
        return lucidType('fixed', 'bool');
    }
    if (/^\d+\.\d+/.test(v) || /\.\d+$/.test(v)) {
        return lucidType('fixed', 'double');
    }
    if (/^\d+$/.test(v)) {
        const n = Number(v);
        if (Number.isSafeInteger(n) && n >= -(2 ** 31) && n <= 2 ** 31 - 1) {
            return lucidType('fixed', 'int32');
        }
        return lucidType('fixed', 'int64');
    }
    return lucidType('fixed', 'int64');
}
function inferPythonDataType(filePath, contract) {
    const source = fs.readFileSync(filePath, 'utf-8');
    const lines = source.split(/\r?\n/);
    const line = lines[contract.definedAt.line - 1] ?? '';
    const rhs = rhsFromDefineLine(line, contract.variableName);
    if (!rhs) {
        return lucidType('fixed', 'int64');
    }
    if (/^(int|float|str|string|bool)$/i.test(rhs)) {
        return typeFromHint(rhs);
    }
    return typeFromRhs(rhs);
}
//# sourceMappingURL=data-type.js.map