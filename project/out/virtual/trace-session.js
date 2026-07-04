"use strict";
/**
 * Phase 2: trace overlay application and JSON loading.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseTraceEventsJson = parseTraceEventsJson;
exports.applyTraceEvents = applyTraceEvents;
const trace_overlay_1 = require("../analysis/trace-overlay");
function parseTraceEventsJson(text) {
    const data = JSON.parse(text);
    if (!Array.isArray(data)) {
        throw new Error('Trace JSON must be an array');
    }
    return data.map((item, index) => {
        const row = item;
        if (typeof row.file !== 'string' || typeof row.line !== 'number' || typeof row.variableName !== 'string') {
            throw new Error(`Invalid trace event at index ${index}`);
        }
        const kind = row.kind;
        if (kind !== 'use' && kind !== 'write' && kind !== 'trigger') {
            throw new Error(`Invalid kind at index ${index}`);
        }
        return {
            file: row.file,
            line: row.line,
            column: typeof row.column === 'number' ? row.column : undefined,
            kind,
            variableName: row.variableName,
            event: typeof row.event === 'string' ? row.event : undefined,
        };
    });
}
function applyTraceEvents(session, events) {
    const merged = (0, trace_overlay_1.mergeTraceOverlay)(session.slice, events);
    return {
        ...session,
        traceEvents: events,
        slice: merged,
    };
}
//# sourceMappingURL=trace-session.js.map