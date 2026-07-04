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
exports.relayoutSession = relayoutSession;
exports.createDefUseSession = createDefUseSession;
exports.createDataFlowSession = createDataFlowSession;
exports.createImpactSession = createImpactSession;
exports.createStructureSession = createStructureSession;
exports.createEventFlowSession = createEventFlowSession;
exports.createEntryPointSession = createEntryPointSession;
exports.pullSession = pullSession;
exports.toggleFunctionFold = toggleFunctionFold;
const path = __importStar(require("path"));
const def_use_slice_1 = require("../projection/def-use-slice");
const data_flow_slice_1 = require("../projection/data-flow-slice");
const entry_point_slice_1 = require("../projection/entry-point-slice");
const event_flow_slice_1 = require("../projection/event-flow-slice");
const impact_slice_1 = require("../projection/impact-slice");
const structure_slice_1 = require("../projection/structure-slice");
const layout_1 = require("./layout");
const fold_store_1 = require("./fold-store");
const trace_overlay_1 = require("../analysis/trace-overlay");
const translation_1 = require("./translation");
function withTrace(slice, session) {
    if (session.traceEvents && session.traceEvents.length > 0) {
        return (0, trace_overlay_1.mergeTraceOverlay)(slice, session.traceEvents);
    }
    return slice;
}
function refreshSlice(session, workspaceRoot) {
    if (session.viewType === 'def-use') {
        return ((0, def_use_slice_1.buildDefUseSliceWorkspace)(session.sourceFilePath, session.scopeId, workspaceRoot) ??
            (0, def_use_slice_1.buildDefUseSlice)(session.sourceFilePath, session.scopeId));
    }
    if (session.viewType === 'data-flow') {
        return (0, data_flow_slice_1.buildDataFlowSlice)(session.sourceFilePath, session.scopeId);
    }
    if (session.viewType === 'entry-point') {
        return (0, entry_point_slice_1.buildEntryPointSlice)(session.sourceFilePath, session.scopeId);
    }
    if (session.viewType === 'event-flow') {
        return (0, event_flow_slice_1.buildEventFlowSlice)(session.sourceFilePath, session.scopeId);
    }
    if (session.viewType === 'impact') {
        return (0, impact_slice_1.buildImpactSlice)(session.sourceFilePath, session.scopeId);
    }
    if (session.viewType === 'structure') {
        return (0, structure_slice_1.buildStructureSlice)(session.sourceFilePath);
    }
    if (session.viewType === 'translation') {
        const parts = session.lineage.virtualUri.match(/lucid:\/\/translation\/([^/]+)\//);
        const targetLang = (parts?.[1] ?? 'cpp');
        const req = {
            sourceFile: session.sourceFilePath,
            scopeId: session.scopeId,
            targetLang,
        };
        return {
            viewType: 'translation',
            scopeId: session.scopeId,
            spans: [],
        };
    }
    return session.slice;
}
function relayoutSession(session, workspaceRoot) {
    const collapsed = (0, fold_store_1.loadFoldState)(workspaceRoot, session.scopeId);
    let slice = session.slice;
    if (session.viewType === 'translation') {
        const parts = session.lineage.virtualUri.match(/lucid:\/\/translation\/([^/]+)\//);
        const targetLang = (parts?.[1] ?? 'cpp');
        const document = (0, translation_1.buildTranslationDocument)({
            sourceFile: session.sourceFilePath,
            scopeId: session.scopeId,
            targetLang,
        });
        return { ...session, document, pulledSnapshot: document.text, collapsedFunctions: collapsed };
    }
    const document = layoutSessionDocument({ ...session, slice }, collapsed);
    return {
        ...session,
        slice,
        document,
        pulledSnapshot: document.text,
        collapsedFunctions: collapsed,
    };
}
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
function layoutSessionDocument(session, collapsed) {
    if (session.viewType === 'data-flow') {
        return (0, layout_1.layoutDataFlowDocument)(session.slice, session.sourceFilePath, collapsed);
    }
    if (session.viewType === 'entry-point') {
        return (0, layout_1.layoutEntryPointDocument)(session.slice, session.sourceFilePath, collapsed);
    }
    if (session.viewType === 'event-flow') {
        return (0, layout_1.layoutEventFlowDocument)(session.slice, session.sourceFilePath, collapsed);
    }
    if (session.viewType === 'impact') {
        return (0, layout_1.layoutImpactDocument)(session.slice, session.sourceFilePath, collapsed);
    }
    if (session.viewType === 'structure') {
        return (0, layout_1.layoutStructureDocument)(session.slice, session.sourceFilePath, collapsed);
    }
    return (0, layout_1.layoutDefUseDocument)(session.slice, session.sourceFilePath, collapsed);
}
function createDataFlowSession(sourceFilePath, dataName, workspaceRoot) {
    const slice = (0, data_flow_slice_1.buildDataFlowSlice)(sourceFilePath, dataName);
    if (!slice) {
        return null;
    }
    const collapsed = (0, fold_store_1.loadFoldState)(workspaceRoot, dataName);
    const document = (0, layout_1.layoutDataFlowDocument)(slice, sourceFilePath, collapsed);
    return {
        viewType: 'data-flow',
        scopeId: dataName,
        sourceFilePath: path.resolve(sourceFilePath),
        slice,
        document,
        pulledSnapshot: document.text,
        collapsedFunctions: collapsed,
        selectedSegmentIds: new Set(),
        lineage: {
            virtualUri: `lucid://view/data-flow/${dataName}`,
            sourceFile: path.resolve(sourceFilePath),
            viewType: 'data-flow',
            scopeId: dataName,
        },
    };
}
function createImpactSession(sourceFilePath, stateName, workspaceRoot) {
    const slice = (0, impact_slice_1.buildImpactSlice)(sourceFilePath, stateName);
    if (!slice) {
        return null;
    }
    const collapsed = (0, fold_store_1.loadFoldState)(workspaceRoot, stateName);
    const document = (0, layout_1.layoutImpactDocument)(slice, sourceFilePath, collapsed);
    return {
        viewType: 'impact',
        scopeId: stateName,
        sourceFilePath: path.resolve(sourceFilePath),
        slice,
        document,
        pulledSnapshot: document.text,
        collapsedFunctions: collapsed,
        selectedSegmentIds: new Set(),
        lineage: {
            virtualUri: `lucid://view/impact/${stateName}`,
            sourceFile: path.resolve(sourceFilePath),
            viewType: 'impact',
            scopeId: stateName,
        },
    };
}
function createStructureSession(sourceFilePath, workspaceRoot) {
    const slice = (0, structure_slice_1.buildStructureSlice)(sourceFilePath);
    if (!slice) {
        return null;
    }
    const collapsed = (0, fold_store_1.loadFoldState)(workspaceRoot, slice.scopeId);
    const document = (0, layout_1.layoutStructureDocument)(slice, sourceFilePath, collapsed);
    return {
        viewType: 'structure',
        scopeId: slice.scopeId,
        sourceFilePath: path.resolve(sourceFilePath),
        slice,
        document,
        pulledSnapshot: document.text,
        collapsedFunctions: collapsed,
        selectedSegmentIds: new Set(),
        lineage: {
            virtualUri: `lucid://view/structure/${slice.scopeId}`,
            sourceFile: path.resolve(sourceFilePath),
            viewType: 'structure',
            scopeId: slice.scopeId,
        },
    };
}
function createEventFlowSession(sourceFilePath, stateName, workspaceRoot) {
    const slice = (0, event_flow_slice_1.buildEventFlowSlice)(sourceFilePath, stateName);
    if (!slice) {
        return null;
    }
    const collapsed = (0, fold_store_1.loadFoldState)(workspaceRoot, stateName);
    const document = (0, layout_1.layoutEventFlowDocument)(slice, sourceFilePath, collapsed);
    return {
        viewType: 'event-flow',
        scopeId: stateName,
        sourceFilePath: path.resolve(sourceFilePath),
        slice,
        document,
        pulledSnapshot: document.text,
        collapsedFunctions: collapsed,
        selectedSegmentIds: new Set(),
        lineage: {
            virtualUri: `lucid://view/event-flow/${stateName}`,
            sourceFile: path.resolve(sourceFilePath),
            viewType: 'event-flow',
            scopeId: stateName,
        },
    };
}
function createEntryPointSession(sourceFilePath, entryName, workspaceRoot) {
    const slice = (0, entry_point_slice_1.buildEntryPointSlice)(sourceFilePath, entryName);
    if (!slice) {
        return null;
    }
    const collapsed = (0, fold_store_1.loadFoldState)(workspaceRoot, entryName);
    const document = (0, layout_1.layoutEntryPointDocument)(slice, sourceFilePath, collapsed);
    return {
        viewType: 'entry-point',
        scopeId: entryName,
        sourceFilePath: path.resolve(sourceFilePath),
        slice,
        document,
        pulledSnapshot: document.text,
        collapsedFunctions: collapsed,
        selectedSegmentIds: new Set(),
        lineage: {
            virtualUri: `lucid://view/entry-point/${entryName}`,
            sourceFile: path.resolve(sourceFilePath),
            viewType: 'entry-point',
            scopeId: entryName,
        },
    };
}
function pullSession(session, workspaceRoot) {
    const collapsed = (0, fold_store_1.loadFoldState)(workspaceRoot, session.scopeId);
    const refreshed = refreshSlice(session, workspaceRoot);
    let slice = refreshed ?? session.slice;
    if (session.viewType === 'def-use' && refreshed) {
        slice = withTrace(refreshed, session);
    }
    const next = { ...session, slice };
    if (session.viewType === 'translation') {
        return relayoutSession(next, workspaceRoot);
    }
    const document = layoutSessionDocument(next, collapsed);
    return {
        ...next,
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
    const document = layoutSessionDocument(session, collapsed);
    return {
        ...session,
        document,
        collapsedFunctions: collapsed,
    };
}
//# sourceMappingURL=session.js.map