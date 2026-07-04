"use strict";
/**
 * Apply trace events to a Virtual File session (shared by command + auto watch).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionAcceptsTraceOverlay = sessionAcceptsTraceOverlay;
exports.applyTraceToSession = applyTraceToSession;
const trace_session_1 = require("./trace-session");
const session_1 = require("./session");
const TRACE_VIEWS = new Set([
    'def-use',
    'data-flow',
    'event-flow',
    'impact',
]);
function sessionAcceptsTraceOverlay(session) {
    return TRACE_VIEWS.has(session.viewType);
}
function applyTraceToSession(session, events, workspaceRoot) {
    if (!sessionAcceptsTraceOverlay(session)) {
        return session;
    }
    let updated = (0, trace_session_1.applyTraceEvents)(session, events);
    updated = (0, session_1.relayoutSession)(updated, workspaceRoot);
    return updated;
}
//# sourceMappingURL=trace-apply.js.map