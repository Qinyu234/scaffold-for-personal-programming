"use strict";
/**
 * lucid:// URI helpers.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildVirtualUri = buildVirtualUri;
exports.buildTranslationUri = buildTranslationUri;
exports.parseTranslationUri = parseTranslationUri;
exports.parseVirtualUri = parseVirtualUri;
function buildVirtualUri(viewType, scopeId, sourceFile) {
    const q = encodeURIComponent(sourceFile);
    return `lucid://view/${viewType}/${scopeId}?file=${q}`;
}
function buildTranslationUri(targetLang, scopeId, sourceFile) {
    const q = encodeURIComponent(sourceFile);
    return `lucid://translation/${targetLang}/${scopeId}?file=${q}`;
}
function parseTranslationUri(uri) {
    try {
        const u = new URL(uri);
        if (u.protocol !== 'lucid:') {
            return null;
        }
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts[0] !== 'translation' || parts.length < 3) {
            return null;
        }
        const file = u.searchParams.get('file');
        if (!file) {
            return null;
        }
        return {
            viewType: `translation:${parts[1]}`,
            scopeId: parts[2],
            sourceFile: decodeURIComponent(file),
        };
    }
    catch {
        return null;
    }
}
function parseVirtualUri(uri) {
    try {
        const u = new URL(uri);
        if (u.protocol !== 'lucid:') {
            return null;
        }
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts[0] !== 'view' || parts.length < 3) {
            return null;
        }
        const file = u.searchParams.get('file');
        if (!file) {
            return null;
        }
        return {
            viewType: parts[1],
            scopeId: parts[2],
            sourceFile: decodeURIComponent(file),
        };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=uri.js.map