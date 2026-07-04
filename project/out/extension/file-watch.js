"use strict";
/**
 * chokidar watch on real source files backing active Virtual File sessions.
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
exports.syncLucidFileWatch = syncLucidFileWatch;
exports.disposeLucidFileWatch = disposeLucidFileWatch;
exports.notifySourceChanged = notifySourceChanged;
const chokidar = __importStar(require("chokidar"));
const vscode = __importStar(require("vscode"));
const session_store_1 = require("./session-store");
let watcher;
function watchedFiles() {
    const files = new Set();
    for (const [, session] of (0, session_store_1.allSessions)()) {
        files.add(session.sourceFilePath);
        for (const seg of session.document.segments) {
            files.add(seg.sourceFile);
        }
    }
    return [...files];
}
function syncLucidFileWatch(onChange) {
    const paths = watchedFiles();
    if (watcher) {
        void watcher.close();
        watcher = undefined;
    }
    if (paths.length === 0) {
        return;
    }
    watcher = chokidar.watch(paths, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200 } });
    watcher.on('change', (filePath) => onChange(filePath));
}
function disposeLucidFileWatch() {
    if (watcher) {
        void watcher.close();
        watcher = undefined;
    }
}
function notifySourceChanged(changedPath) {
    void vscode.window
        .showInformationMessage(`Lucid: source changed — ${changedPath}`, 'Pull now')
        .then(choice => {
        if (choice === 'Pull now') {
            void vscode.commands.executeCommand('lucid.pull');
        }
    });
}
//# sourceMappingURL=file-watch.js.map