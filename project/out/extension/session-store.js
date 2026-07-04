"use strict";
/**
 * In-memory session store keyed by lucid:// URI.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionKey = sessionKey;
exports.putSession = putSession;
exports.getSession = getSession;
exports.getDocumentText = getDocumentText;
exports.setDocumentText = setDocumentText;
exports.updateSession = updateSession;
exports.allSessions = allSessions;
const uri_1 = require("../virtual/uri");
const sessions = new Map();
const dirtyText = new Map();
function sessionKey(session) {
    return (0, uri_1.buildVirtualUri)(session.viewType, session.scopeId, session.sourceFilePath);
}
function putSession(session) {
    const key = sessionKey(session);
    sessions.set(key, session);
    dirtyText.set(key, session.document.text);
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