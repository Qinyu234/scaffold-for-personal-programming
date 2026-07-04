"use strict";
/**
 * Entry Point View (JS/TS): call tree from a function via ts-morph.
 * scopeId = entry function name; layout order = call discovery order (DESIGN.md).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listEntryPointFunctions = listEntryPointFunctions;
exports.buildEntryPointSlice = buildEntryPointSlice;
exports.functionNodeId = functionNodeId;
const ts_morph_1 = require("ts-morph");
const language_1 = require("../ingestion/language");
const BUILTIN_CALLEES = new Set([
    'useState',
    'useEffect',
    'useCallback',
    'useMemo',
    'useRef',
    'useContext',
    'useReducer',
    'console',
    'Math',
    'JSON',
    'Object',
    'Array',
    'String',
    'Number',
    'Boolean',
    'parseInt',
    'parseFloat',
    'require',
    'setTimeout',
    'clearTimeout',
    'setInterval',
    'clearInterval',
]);
function isJsFamily(filePath) {
    const lang = (0, language_1.detectLanguage)(filePath);
    return lang === 'typescript';
}
function calleeName(expr) {
    const kind = expr.getKind();
    if (kind === ts_morph_1.SyntaxKind.Identifier) {
        return expr.getText();
    }
    if (kind === ts_morph_1.SyntaxKind.PropertyAccessExpression && typeof expr.getName === 'function') {
        return expr.getName();
    }
    return null;
}
function findFunctionByName(sourceFile, name) {
    for (const fn of sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.FunctionDeclaration)) {
        if (fn.getName() === name) {
            return fn;
        }
    }
    return undefined;
}
function buildFunctionIndex(sourceFile, filePath) {
    const index = new Map();
    for (const fn of sourceFile.getDescendantsOfKind(ts_morph_1.SyntaxKind.FunctionDeclaration)) {
        const name = fn.getName();
        if (name && !index.has(name)) {
            index.set(name, fn);
        }
    }
    return index;
}
function directCallees(fn) {
    const body = fn.getBody();
    if (!body) {
        return [];
    }
    const out = [];
    for (const call of body.getDescendantsOfKind(ts_morph_1.SyntaxKind.CallExpression)) {
        const name = calleeName(call.getExpression());
        if (!name || BUILTIN_CALLEES.has(name) || (name.startsWith('set') && name.length > 3)) {
            continue;
        }
        out.push({ name, line: call.getStartLineNumber() });
    }
    return out;
}
function listEntryPointFunctions(filePath) {
    if (!isJsFamily(filePath)) {
        return [];
    }
    const project = new ts_morph_1.Project({ compilerOptions: { allowJs: true } });
    const sourceFile = project.addSourceFileAtPath(filePath);
    return [...buildFunctionIndex(sourceFile, filePath).keys()].sort();
}
function buildEntryPointSlice(filePath, entryName) {
    if (!isJsFamily(filePath)) {
        return null;
    }
    const project = new ts_morph_1.Project({ compilerOptions: { allowJs: true } });
    const sourceFile = project.addSourceFileAtPath(filePath);
    const fnIndex = buildFunctionIndex(sourceFile, filePath);
    const entryFn = fnIndex.get(entryName);
    if (!entryFn) {
        return null;
    }
    const callOrder = [];
    const edges = [];
    const seen = new Set();
    const queue = [entryName];
    while (queue.length > 0) {
        const current = queue.shift();
        if (seen.has(current)) {
            continue;
        }
        seen.add(current);
        callOrder.push(current);
        const fn = fnIndex.get(current);
        if (!fn) {
            continue;
        }
        for (const { name, line } of directCallees(fn)) {
            if (!fnIndex.has(name)) {
                continue;
            }
            edges.push({ caller: current, callee: name, callLine: line });
            if (!seen.has(name)) {
                queue.push(name);
            }
        }
    }
    const functions = callOrder.map((name, order) => {
        const fn = fnIndex.get(name);
        return {
            name,
            file: filePath,
            startLine: fn.getStartLineNumber(),
            endLine: fn.getEndLineNumber(),
            order,
        };
    });
    const spans = functions.map(f => ({
        file: f.file,
        line: f.startLine,
        column: 1,
        enclosingFunction: f.name,
        kind: 'define',
        variableName: f.name,
    }));
    return {
        viewType: 'entry-point',
        scopeId: entryName,
        entryFunction: entryName,
        callOrder,
        edges,
        functions,
        spans,
    };
}
function functionNodeId(name) {
    return `fn:${name}`;
}
//# sourceMappingURL=entry-point-slice.js.map