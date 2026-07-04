"use strict";
/**
 * Layout Projection Slice into editable Virtual Document (display headers are not patched).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.layoutDefUseDocument = layoutDefUseDocument;
exports.layoutDataFlowDocument = layoutDataFlowDocument;
exports.layoutEventFlowDocument = layoutEventFlowDocument;
exports.layoutEntryPointDocument = layoutEntryPointDocument;
exports.layoutImpactDocument = layoutImpactDocument;
exports.layoutStructureDocument = layoutStructureDocument;
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
const DATA_FLOW_KIND_ORDER = ['define', 'write', 'use'];
const DATA_FLOW_LABEL = {
    define: 'type interpretation',
    write: 'write sites',
    use: 'read sites',
};
function layoutDataFlowDocument(slice, primaryFilePath, collapsedFunctions) {
    const lines = [];
    const segments = [];
    lines.push(`# Lucid data-flow view: ${slice.scopeId}`);
    lines.push(`# type: ${slice.dataType.label} (${slice.dataType.length}, ${slice.dataType.interpretation})`);
    lines.push(`# source: ${primaryFilePath}`);
    lines.push('');
    const sourceLines = (0, extract_1.readSourceLines)(primaryFilePath);
    const byKind = new Map();
    for (const span of slice.spans) {
        const list = byKind.get(span.kind) ?? [];
        list.push(span);
        byKind.set(span.kind, list);
    }
    for (const kind of DATA_FLOW_KIND_ORDER) {
        const spans = byKind.get(kind);
        if (!spans || spans.length === 0) {
            continue;
        }
        lines.push(`# --- ${DATA_FLOW_LABEL[kind] ?? kind} ---`);
        for (const span of spans) {
            const collapsed = isFunctionCollapsed(span.enclosingFunction, collapsedFunctions);
            const regionLabel = span.enclosingFunction === '<module>' ? kind : span.enclosingFunction;
            lines.push(`#region ${regionLabel}`);
            if (collapsed) {
                lines.push(`# [collapsed] ${span.enclosingFunction}`);
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
                lines.push(`# [${span.file}:${span.line}]`);
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
    return { text: lines.join('\n'), segments };
}
const EVENT_FLOW_KIND_ORDER = ['define', 'trigger', 'write', 'use'];
const EVENT_FLOW_LABEL = {
    define: 'state definition',
    trigger: 'event triggers',
    write: 'state writes',
    use: 'state reads',
};
function layoutEventFlowDocument(slice, primaryFilePath, collapsedFunctions) {
    const lines = [];
    const segments = [];
    lines.push(`// Lucid event-flow view: ${slice.scopeId}`);
    lines.push(`// source: ${primaryFilePath}`);
    lines.push('');
    const sourceLines = (0, extract_1.readSourceLines)(primaryFilePath);
    const byKind = new Map();
    for (const span of slice.spans) {
        const list = byKind.get(span.kind) ?? [];
        list.push(span);
        byKind.set(span.kind, list);
    }
    for (const kind of EVENT_FLOW_KIND_ORDER) {
        const spans = byKind.get(kind);
        if (!spans || spans.length === 0) {
            continue;
        }
        lines.push(`// --- ${EVENT_FLOW_LABEL[kind] ?? kind} ---`);
        for (const span of spans) {
            const collapsed = isFunctionCollapsed(span.enclosingFunction, collapsedFunctions);
            lines.push(`#region ${span.enclosingFunction === '<module>' ? kind : span.enclosingFunction}`);
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
                const prov = span.event ? ` ${span.event}` : '';
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
    return { text: lines.join('\n'), segments };
}
function layoutEntryPointDocument(slice, primaryFilePath, collapsedFunctions) {
    const lines = [];
    const segments = [];
    const sourceLines = (0, extract_1.readSourceLines)(primaryFilePath);
    lines.push(`// Lucid entry-point view: ${slice.scopeId}`);
    lines.push(`// source: ${primaryFilePath}`);
    lines.push(`// call order: ${slice.callOrder.join(' → ')}`);
    lines.push('');
    for (const fn of slice.functions) {
        const collapsed = isFunctionCollapsed(fn.name, collapsedFunctions);
        const orderLabel = fn.order + 1;
        lines.push(`// --- [${orderLabel}] ${fn.name}${fn.name === slice.entryFunction ? ' (entry)' : ''} ---`);
        lines.push(`#region ${fn.name}`);
        if (collapsed) {
            lines.push(`# [collapsed] ${fn.name}`);
            const virtualStart = lines.length;
            lines.push('');
            const virtualEnd = lines.length;
            segments.push({
                id: segmentId('define', fn.file, fn.startLine, 1),
                kind: 'define',
                sourceFile: fn.file,
                sourceLine: fn.startLine,
                sourceEndLine: fn.endLine,
                virtualStartLine: virtualStart,
                virtualEndLine: virtualEnd,
                collapsed: true,
                enclosingFunction: fn.name,
            });
        }
        else {
            lines.push(`# [${fn.file}:${fn.startLine}-${fn.endLine}]`);
            const virtualStart = lines.length + 1;
            for (let ln = fn.startLine; ln <= fn.endLine; ln++) {
                lines.push((0, extract_1.getLineContent)(sourceLines, ln));
            }
            const virtualEnd = lines.length;
            segments.push({
                id: segmentId('define', fn.file, fn.startLine, 1),
                kind: 'define',
                sourceFile: fn.file,
                sourceLine: fn.startLine,
                sourceEndLine: fn.endLine,
                virtualStartLine: virtualStart,
                virtualEndLine: virtualEnd,
                collapsed: false,
                enclosingFunction: fn.name,
            });
        }
        lines.push('#endregion');
        lines.push('');
    }
    return { text: lines.join('\n'), segments };
}
const IMPACT_KIND_ORDER = ['define', 'write', 'use'];
const IMPACT_LABEL = {
    define: 'change anchor',
    write: 'mutation sites',
    use: 'downstream impact',
};
function layoutImpactDocument(slice, primaryFilePath, collapsedFunctions) {
    return layoutKindSections(`// Lucid impact view: ${slice.scopeId}`, primaryFilePath, slice.spans, IMPACT_KIND_ORDER, IMPACT_LABEL, collapsedFunctions);
}
function layoutStructureDocument(slice, primaryFilePath, collapsedFunctions) {
    const lines = [];
    const segments = [];
    const sourceLines = (0, extract_1.readSourceLines)(primaryFilePath);
    lines.push(`// Lucid structure view: ${slice.scopeId}`);
    lines.push(`// source: ${primaryFilePath}`);
    lines.push('// --- imports ---');
    for (const span of slice.spans) {
        lines.push(`#region ${span.variableName ?? 'import'}`);
        lines.push(`// [${span.file}:${span.line}]`);
        const virtualStart = lines.length + 1;
        lines.push((0, extract_1.getLineContent)(sourceLines, span.line));
        const virtualEnd = lines.length;
        segments.push({
            id: segmentId('import', span.file, span.line, span.column),
            kind: 'import',
            sourceFile: span.file,
            sourceLine: span.line,
            virtualStartLine: virtualStart,
            virtualEndLine: virtualEnd,
            collapsed: false,
            enclosingFunction: span.enclosingFunction,
        });
        lines.push('#endregion');
        lines.push('');
    }
    return { text: lines.join('\n'), segments };
}
function layoutKindSections(header, primaryFilePath, spans, kindOrder, labels, collapsedFunctions) {
    const lines = [];
    const segments = [];
    lines.push(header);
    lines.push(`// source: ${primaryFilePath}`);
    lines.push('');
    const sourceLines = (0, extract_1.readSourceLines)(primaryFilePath);
    const byKind = new Map();
    for (const span of spans) {
        const list = byKind.get(span.kind) ?? [];
        list.push(span);
        byKind.set(span.kind, list);
    }
    for (const kind of kindOrder) {
        const group = byKind.get(kind);
        if (!group?.length) {
            continue;
        }
        lines.push(`// --- ${labels[kind] ?? kind} ---`);
        for (const span of group) {
            const collapsed = isFunctionCollapsed(span.enclosingFunction, collapsedFunctions);
            lines.push(`#region ${span.enclosingFunction === '<module>' ? kind : span.enclosingFunction}`);
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
                lines.push(`// [${span.file}:${span.line}]`);
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