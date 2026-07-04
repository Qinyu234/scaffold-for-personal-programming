"use strict";
/**
 * Runtime trace overlay — merge observed events into Projection Slice spans.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.traceEventToSpan = traceEventToSpan;
exports.mergeTraceOverlay = mergeTraceOverlay;
function traceEventToSpan(event) {
    return {
        file: event.file,
        line: event.line,
        column: event.column ?? 0,
        enclosingFunction: '<module>',
        kind: event.kind,
        variableName: event.variableName,
        event: event.event,
        provenance: 'observed',
    };
}
function mergeTraceOverlay(slice, events) {
    if (events.length === 0) {
        return slice;
    }
    const inferred = slice.spans.map(s => ({ ...s, provenance: s.provenance ?? 'inferred' }));
    const seen = new Set(inferred.map(s => `${s.file}:${s.line}:${s.kind}:${s.variableName}`));
    const extra = [];
    for (const event of events) {
        if (event.variableName !== slice.scopeId) {
            continue;
        }
        const span = traceEventToSpan(event);
        const key = `${span.file}:${span.line}:${span.kind}:${span.variableName}`;
        if (!seen.has(key)) {
            seen.add(key);
            extra.push(span);
        }
        else {
            for (const s of inferred) {
                const match = s.file === span.file &&
                    s.line === span.line &&
                    s.kind === span.kind &&
                    s.variableName === span.variableName;
                if (match) {
                    s.provenance = 'observed';
                }
            }
        }
    }
    return {
        ...slice,
        spans: [...inferred, ...extra],
    };
}
//# sourceMappingURL=trace-overlay.js.map