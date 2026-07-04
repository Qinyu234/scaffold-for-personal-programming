"use strict";
/**
 * Stable source location for Projection Slice Cut / patch mapping.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidSpan = isValidSpan;
function isValidSpan(span) {
    return (span.file.length > 0 &&
        span.line >= 1 &&
        span.column >= 0 &&
        span.enclosingFunction.length > 0);
}
//# sourceMappingURL=span.js.map