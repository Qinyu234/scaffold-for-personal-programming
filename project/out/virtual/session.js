"use strict";
/**
 * Create and pull Virtual File sessions.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDefUseSession = createDefUseSession;
exports.pullSession = pullSession;
exports.toggleFunctionFold = toggleFunctionFold;
const path = __importStar(require("path"));
const def_use_slice_1 = require("../projection/def-use-slice");
const layout_1 = require("./layout");
const fold_store_1 = require("./fold-store");
function createDefUseSession(sourceFilePath, stateName, workspaceRoot) {
    const slice = (0, def_use_slice_1.buildDefUseSliceWorkspace)(sourceFilePath, stateName, workspaceRoot) ??
        (0, def_use_slice_1.buildDefUseSlice)(sourceFilePath, stateName);
    if (!slice) {
        return null;
    }
    const collapsed = (0, fold_store_1.loadFoldState)(workspaceRoot, stateName);
    const document = (0, layout_1.layoutDefUseDocument)(slice, sourceFilePath, collapsed);
    return {
        viewType: 'def-use',
        scopeId: stateName,
        sourceFilePath: path.resolve(sourceFilePath),
        slice,
        document,
        pulledSnapshot: document.text,
        collapsedFunctions: collapsed,
        selectedSegmentIds: new Set(),
        lineage: {
            virtualUri: `lucid://view/def-use/${stateName}`,
            sourceFile: path.resolve(sourceFilePath),
            viewType: 'def-use',
            scopeId: stateName,
        },
    };
}
function pullSession(session, workspaceRoot) {
    const collapsed = (0, fold_store_1.loadFoldState)(workspaceRoot, session.scopeId);
    const document = (0, layout_1.layoutDefUseDocument)(session.slice, session.sourceFilePath, collapsed);
    return {
        ...session,
        document,
        pulledSnapshot: document.text,
        collapsedFunctions: collapsed,
    };
}
function toggleFunctionFold(session, functionName) {
    const collapsed = new Set(session.collapsedFunctions);
    if (collapsed.has(functionName)) {
        collapsed.delete(functionName);
    }
    else {
        collapsed.add(functionName);
    }
    const document = (0, layout_1.layoutDefUseDocument)(session.slice, session.sourceFilePath, collapsed);
    return {
        ...session,
        document,
        collapsedFunctions: collapsed,
    };
}
//# sourceMappingURL=session.js.map