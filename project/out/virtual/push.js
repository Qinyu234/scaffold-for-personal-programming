"use strict";
/**
 * push overlay — save_selected / save_all back to real source (single-file lines).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.pushOverlay = pushOverlay;
exports.selectSegmentForFunction = selectSegmentForFunction;
exports.selectAllSegments = selectAllSegments;
const extract_1 = require("./extract");
const layout_1 = require("./layout");
function segmentsToPush(session, mode) {
    const { segments } = session.document;
    if (mode === 'all') {
        return segments.filter(s => !s.collapsed);
    }
    if (session.selectedSegmentIds.size === 0) {
        return [];
    }
    return segments.filter(s => !s.collapsed && session.selectedSegmentIds.has(s.id));
}
function pushOverlay(session, virtualText, mode) {
    const toPush = segmentsToPush(session, mode);
    let updatedLines = 0;
    const files = new Set();
    for (const segment of toPush) {
        const content = (0, layout_1.parseSegmentContent)(virtualText, segment);
        if (!content || content.startsWith('// [collapsed]')) {
            continue;
        }
        (0, extract_1.replaceSourceLine)(segment.sourceFile, segment.sourceLine, content);
        files.add(segment.sourceFile);
        updatedLines++;
    }
    return {
        updatedFiles: [...files],
        updatedLines,
    };
}
function selectSegmentForFunction(session, functionName) {
    const ids = new Set();
    for (const s of session.document.segments) {
        if (s.enclosingFunction === functionName || s.id.includes(functionName)) {
            ids.add(s.id);
        }
    }
    return { ...session, selectedSegmentIds: ids };
}
function selectAllSegments(session) {
    return {
        ...session,
        selectedSegmentIds: new Set(session.document.segments.map(s => s.id)),
    };
}
//# sourceMappingURL=push.js.map