"use strict";
/**
 * Layout Projection Slice into editable Virtual Document (display headers are not patched).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.layoutDefUseDocument = layoutDefUseDocument;
exports.parseSegmentContent = parseSegmentContent;
const extract_1 = require("./extract");
const KIND_ORDER = ['define', 'write', 'trigger', 'use'];
const KIND_LABEL = {
    define: 'state define',
    write: 'write sites',
    trigger: 'event triggers',
    use: 'use sites',
};
function segmentId(kind, file, line, column) {
    return `${kind}:${file}:${line}:${column}`;
}
function isFunctionCollapsed(enclosing, collapsed) {
    return enclosing !== '<module>' && collapsed.has(enclosing);
}
function layoutDefUseDocument(slice, primaryFilePath, collapsedFunctions) {
    const filesInSlice = [...new Set(slice.spans.map(s => s.file))].sort();
    const lines = [];
    const segments = [];
    lines.push(`// Lucid def-use view: ${slice.scopeId}`);
    if (filesInSlice.length <= 1) {
        lines.push(`// source: ${primaryFilePath}`);
    }
    else {
        lines.push(`// workspace slice (${filesInSlice.length} files)`);
    }
    lines.push('');
    for (const filePath of filesInSlice.length > 0 ? filesInSlice : [primaryFilePath]) {
        if (filesInSlice.length > 1) {
            lines.push(`// ===== ${filePath} =====`);
            lines.push('');
        }
        const byKind = new Map();
        for (const span of slice.spans) {
            if (span.file !== filePath) {
                continue;
            }
            const list = byKind.get(span.kind) ?? [];
            list.push(span);
            byKind.set(span.kind, list);
        }
        const sourceLines = (0, extract_1.readSourceLines)(filePath);
        for (const kind of KIND_ORDER) {
            const spans = byKind.get(kind);
            if (!spans || spans.length === 0) {
                continue;
            }
            lines.push(`// --- ${KIND_LABEL[kind] ?? kind} ---`);
            for (const span of spans) {
                const collapsed = isFunctionCollapsed(span.enclosingFunction, collapsedFunctions);
                const regionLabel = span.enclosingFunction === '<module>' ? kind : span.enclosingFunction;
                lines.push(`#region ${regionLabel}`);
                if (collapsed) {
                    lines.push(`// [collapsed] ${span.enclosingFunction}`);
                    const virtualStart = lines.length;
                    lines.push('');
                    const virtualEnd = lines.length;
                    segments.push({
                        id: segmentId(span.kind, span.file, span.line, span.column),
                        kind: span.kind,
                        sourceFile: span.file,
                        sourceLine: span.line,
                        virtualStartLine: virtualStart,
                        virtualEndLine: virtualEnd,
                        collapsed: true,
                        enclosingFunction: span.enclosingFunction,
                    });
                }
                else {
                    const prov = span.provenance === 'observed' ? ' [observed]' : '';
                    lines.push(`// [${span.file}:${span.line}]${prov}`);
                    const virtualStart = lines.length + 1;
                    lines.push((0, extract_1.getLineContent)(sourceLines, span.line));
                    const virtualEnd = lines.length;
                    segments.push({
                        id: segmentId(span.kind, span.file, span.line, span.column),
                        kind: span.kind,
                        sourceFile: span.file,
                        sourceLine: span.line,
                        virtualStartLine: virtualStart,
                        virtualEndLine: virtualEnd,
                        collapsed: false,
                        enclosingFunction: span.enclosingFunction,
                    });
                }
                lines.push('#endregion');
                lines.push('');
            }
        }
    }
    return { text: lines.join('\n'), segments };
}
function parseSegmentContent(virtualText, segment) {
    const lines = virtualText.split(/\r?\n/);
    const start = segment.virtualStartLine - 1;
    const end = segment.virtualEndLine;
    if (segment.collapsed) {
        return (0, extract_1.getLineContent)(lines, segment.virtualStartLine) ?? '';
    }
    const chunk = lines.slice(start, end).join('\n').trimEnd();
    return chunk;
}
//# sourceMappingURL=layout.js.map