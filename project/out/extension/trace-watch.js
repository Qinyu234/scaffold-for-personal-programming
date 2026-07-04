"use strict";
/**
 * Auto-watch `.lucid/trace.json` and merge trace overlay into open sessions.
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
exports.syncTraceJsonWatch = syncTraceJsonWatch;
exports.reloadTraceFromDefaultPath = reloadTraceFromDefaultPath;
exports.disposeTraceJsonWatch = disposeTraceJsonWatch;
const chokidar = __importStar(require("chokidar"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const session_store_1 = require("./session-store");
const lucid_paths_1 = require("./lucid-paths");
const trace_session_1 = require("../virtual/trace-session");
const trace_apply_1 = require("../virtual/trace-apply");
let traceWatcher;
let lastWorkspaceRoot;
function mergeTraceFile(workspaceRoot, onApplied) {
    const filePath = (0, lucid_paths_1.traceJsonPath)(workspaceRoot);
    if (!fs.existsSync(filePath)) {
        return;
    }
    let events;
    try {
        events = (0, trace_session_1.parseTraceEventsJson)(fs.readFileSync(filePath, 'utf8'));
    }
    catch {
        return;
    }
    let sessionCount = 0;
    for (const [, session] of (0, session_store_1.allSessions)()) {
        if (!(0, trace_apply_1.sessionAcceptsTraceOverlay)(session)) {
            continue;
        }
        (0, session_store_1.putSession)((0, trace_apply_1.applyTraceToSession)(session, events, workspaceRoot));
        sessionCount++;
    }
    onApplied?.({ eventCount: events.length, sessionCount });
}
function syncTraceJsonWatch(workspaceRoot, onApplied) {
    lastWorkspaceRoot = workspaceRoot;
    const lucidDir = path.join(workspaceRoot, '.lucid');
    if (traceWatcher) {
        void traceWatcher.close();
        traceWatcher = undefined;
    }
    if (!fs.existsSync(lucidDir)) {
        fs.mkdirSync(lucidDir, { recursive: true });
    }
    traceWatcher = chokidar.watch(lucidDir, {
        ignoreInitial: false,
        depth: 0,
        awaitWriteFinish: { stabilityThreshold: 200 },
    });
    const onTraceFile = (changed) => {
        if (path.basename(changed) === 'trace.json') {
            mergeTraceFile(workspaceRoot, onApplied);
        }
    };
    traceWatcher.on('add', onTraceFile);
    traceWatcher.on('change', onTraceFile);
    mergeTraceFile(workspaceRoot, onApplied);
}
function reloadTraceFromDefaultPath(onApplied) {
    if (!lastWorkspaceRoot) {
        return false;
    }
    const filePath = (0, lucid_paths_1.traceJsonPath)(lastWorkspaceRoot);
    if (!fs.existsSync(filePath)) {
        return false;
    }
    mergeTraceFile(lastWorkspaceRoot, onApplied);
    return true;
}
function disposeTraceJsonWatch() {
    if (traceWatcher) {
        void traceWatcher.close();
        traceWatcher = undefined;
    }
    lastWorkspaceRoot = undefined;
}
//# sourceMappingURL=trace-watch.js.map