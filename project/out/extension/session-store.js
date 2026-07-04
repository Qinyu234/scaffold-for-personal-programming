"use strict";
/**
 * In-memory session store keyed by lucid:// URI.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.setOnSessionsChanged = setOnSessionsChanged;
exports.sessionKey = sessionKey;
exports.putSession = putSession;
exports.getSession = getSession;
exports.getDocumentText = getDocumentText;
exports.setDocumentText = setDocumentText;
exports.updateSession = updateSession;
exports.allSessions = allSessions;
const sessions = new Map();
const dirtyText = new Map();
let onSessionsChanged;
function setOnSessionsChanged(handler) {
    onSessionsChanged = handler;
}
function sessionKey(session) {
    return session.lineage.virtualUri;
}
function putSession(session) {
    const key = sessionKey(session);
    sessions.set(key, session);
    dirtyText.set(key, session.document.text);
    onSessionsChanged?.();
    return key;
}
function getSession(uri) {
    return sessions.get(uri);
}
function getDocumentText(uri) {
    return dirtyText.get(uri);
}
function setDocumentText(uri, text) {
    dirtyText.set(uri, text);
}
function updateSession(uri, session) {
    sessions.set(uri, session);
}
function allSessions() {
    return sessions.entries();
}
//# sourceMappingURL=session-store.js.map