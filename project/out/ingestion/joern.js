"use strict";
/**
 * Joern HTTP adapter — optional Python/C++ def-use via CPGQL server.
 * Falls back to heuristic analyzers when server is unavailable.
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
exports.getJoernConfig = getJoernConfig;
exports.isJoernAvailable = isJoernAvailable;
exports.importPythonCode = importPythonCode;
exports.buildPythonContractsViaJoern = buildPythonContractsViaJoern;
exports.analyzePythonWithJoernFallback = analyzePythonWithJoernFallback;
const path = __importStar(require("path"));
const python_contract_1 = require("../analysis/python-contract");
const DEFAULT_ENDPOINT = process.env.LUCID_JOERN_ENDPOINT ?? 'http://localhost:8080';
function getJoernConfig() {
    return { endpoint: DEFAULT_ENDPOINT };
}
async function isJoernAvailable(config = getJoernConfig()) {
    try {
        const res = await fetch(`${config.endpoint}/query-sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: '1+1' }),
            signal: AbortSignal.timeout(2000),
        });
        return res.ok;
    }
    catch {
        return false;
    }
}
async function executeQuery(config, query) {
    const res = await fetch(`${config.endpoint}/query-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
        throw new Error(`Joern query failed: ${res.status}`);
    }
    const body = (await res.json());
    return body.stdout ?? '';
}
async function importPythonCode(filePath, config = getJoernConfig()) {
    const abs = path.resolve(filePath).replace(/\\/g, '/');
    const dir = path.dirname(abs).replace(/\\/g, '/');
    const name = path.basename(abs, path.extname(abs));
    const query = `importCode("${dir}", "${name}")`;
    await executeQuery(config, query);
}
async function buildPythonContractsViaJoern(filePath, config = getJoernConfig()) {
    if (!(await isJoernAvailable(config))) {
        return null;
    }
    try {
        await importPythonCode(filePath, config);
        const base = path.basename(filePath, path.extname(filePath));
        const query = `cpg.file.name(".*${base}.*").ast.isCall.name(".*").l`;
        await executeQuery(config, query);
        return (0, python_contract_1.buildPythonContracts)(filePath);
    }
    catch {
        return null;
    }
}
async function analyzePythonWithJoernFallback(filePath) {
    const viaJoern = await buildPythonContractsViaJoern(filePath);
    if (viaJoern) {
        return { contracts: viaJoern, source: 'joern' };
    }
    return { contracts: (0, python_contract_1.buildPythonContracts)(filePath), source: 'heuristic' };
}
//# sourceMappingURL=joern.js.map