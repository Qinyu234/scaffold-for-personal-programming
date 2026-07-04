"use strict";
/**
 * Lucid VS Code extension — Phase 1.
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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const analyze_1 = require("./core/analyze");
const graph_1 = require("./projection/graph");
const session_1 = require("./virtual/session");
const push_1 = require("./virtual/push");
const fork_1 = require("./virtual/fork");
const fold_store_1 = require("./virtual/fold-store");
const lucid_fs_1 = require("./extension/lucid-fs");
const graph_panel_1 = require("./extension/graph-panel");
const session_store_1 = require("./extension/session-store");
let extContext;
let activeUri;
function workspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}
async function openVirtualDocument(uri) {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
    await vscode.window.showTextDocument(doc, { preview: false });
}
function handleGraphMessage(uri) {
    return async (msg) => {
        const m = msg;
        if (m.type === 'openDocument') {
            await openVirtualDocument(uri);
            return;
        }
        if (m.type === 'nodeSelected' && m.nodeId) {
            const s = (0, session_store_1.getSession)(uri);
            if (!s) {
                return;
            }
            const seg = s.document.segments.find(x => m.nodeId.includes(String(x.sourceLine)));
            if (seg && seg.enclosingFunction !== '<module>') {
                (0, session_store_1.updateSession)(uri, (0, push_1.selectSegmentForFunction)(s, seg.enclosingFunction));
            }
            return;
        }
        if (m.type === 'rebind') {
            const confirm = await vscode.window.showWarningMessage('Lucid: confirm rebind? (never automatic)', { modal: true }, 'Confirm');
            if (confirm === 'Confirm') {
                void vscode.window.showInformationMessage('Lucid: rebind queued (IR edge update in follow-up).');
            }
            return;
        }
        if (m.type === 'fork') {
            await runFork(uri);
        }
    };
}
async function runFork(uri) {
    const session = (0, session_store_1.getSession)(uri);
    if (!session) {
        return;
    }
    const kind = await vscode.window.showQuickPick(['function', 'file'], { title: 'Fork kind' });
    if (!kind) {
        return;
    }
    const defaultName = (0, fork_1.suggestForkName)(session.scopeId, kind);
    const name = await vscode.window.showInputBox({ title: 'Fork name', value: defaultName });
    if (!name) {
        return;
    }
    if (kind === 'function') {
        const fns = [...new Set(session.document.segments.map(s => s.enclosingFunction).filter(f => f !== '<module>'))];
        const fn = await vscode.window.showQuickPick(fns, { title: 'Function to fork' });
        if (!fn) {
            return;
        }
        const result = (0, fork_1.forkFunctionInFile)(session.sourceFilePath, fn, name);
        if (result) {
            void vscode.window.showInformationMessage(`Lucid: forked ${name} in same file.`);
        }
    }
    else {
        const result = path.extname(session.sourceFilePath) === '.py'
            ? (0, fork_1.forkPythonFileCopy)(session.sourceFilePath, name)
            : (0, fork_1.forkFileInDirectory)(session.sourceFilePath, name);
        if (result) {
            void vscode.window.showInformationMessage(`Lucid: fork → ${result.targetPath}`);
        }
    }
}
async function startDefUse(filePath, stateName) {
    const session = (0, session_1.createDefUseSession)(filePath, stateName, workspaceRoot());
    if (!session) {
        void vscode.window.showWarningMessage(`Lucid: no slice for "${stateName}".`);
        return;
    }
    const uri = (0, session_store_1.putSession)(session);
    activeUri = uri;
    const spec = (0, graph_1.graphFromDefUseSlice)(session.slice);
    graph_panel_1.GraphPanel.show(extContext, spec, handleGraphMessage(uri));
    await openVirtualDocument(uri);
}
function activate(context) {
    extContext = context;
    const fsProvider = new lucid_fs_1.LucidFileSystemProvider();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('lucid', fsProvider, { isCaseSensitive: true }));
    context.subscriptions.push(vscode.commands.registerCommand('lucid.openDefUse', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showWarningMessage('Lucid: no active editor.');
            return;
        }
        const contracts = (0, analyze_1.analyzeFile)(editor.document.uri.fsPath);
        if (contracts.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no contracts.');
            return;
        }
        const stateName = await vscode.window.showQuickPick(contracts.map(c => c.variableName), {
            title: 'Select state (scopeId)',
        });
        if (stateName) {
            await startDefUse(editor.document.uri.fsPath, stateName);
        }
    }), vscode.commands.registerCommand('lucid.analyzeState', () => vscode.commands.executeCommand('lucid.openDefUse')), vscode.commands.registerCommand('lucid.openView', async () => {
        const viewType = await vscode.window.showQuickPick(['def-use', 'entry-point', 'impact', 'structure', 'event-flow', 'data-flow'], { title: 'Lucid view' });
        if (!viewType) {
            return;
        }
        if (viewType === 'def-use') {
            await vscode.commands.executeCommand('lucid.openDefUse');
            return;
        }
        const scopeId = await vscode.window.showInputBox({ title: 'scopeId' });
        if (!scopeId) {
            return;
        }
        const builder = graph_1.VIEW_GRAPH_BUILDERS[viewType];
        if (builder) {
            graph_panel_1.GraphPanel.show(extContext, builder(scopeId), () => undefined);
        }
    }), vscode.commands.registerCommand('lucid.pull', async () => {
        const uri = activeUri;
        const session = uri ? (0, session_store_1.getSession)(uri) : undefined;
        if (!session) {
            return;
        }
        const choice = await vscode.window.showWarningMessage('Lucid: source changed — choose merge strategy', { modal: true }, 'Keep virtual edits', 'Discard virtual edits');
        const pulled = (0, session_1.pullSession)(session, workspaceRoot());
        if (choice === 'Discard virtual edits') {
            (0, session_store_1.putSession)(pulled);
            await openVirtualDocument(uri);
        }
        else if (choice === 'Keep virtual edits') {
            pulled.document.text = (0, session_store_1.getDocumentText)(uri) ?? pulled.document.text;
            (0, session_store_1.putSession)(pulled);
        }
    }), vscode.commands.registerCommand('lucid.toggleFold', async () => {
        const uri = activeUri;
        const session = uri ? (0, session_store_1.getSession)(uri) : undefined;
        if (!session) {
            return;
        }
        const fns = [...new Set(session.document.segments.map(s => s.enclosingFunction).filter(f => f !== '<module>'))];
        const pick = await vscode.window.showQuickPick(fns, { title: 'Toggle fold' });
        if (!pick) {
            return;
        }
        const toggled = (0, session_1.toggleFunctionFold)(session, pick);
        (0, fold_store_1.saveFoldState)(workspaceRoot(), session.scopeId, toggled.collapsedFunctions);
        (0, session_store_1.putSession)(toggled);
        await openVirtualDocument(uri);
    }), vscode.commands.registerCommand('lucid.saveSelected', async () => {
        const editor = vscode.window.activeTextEditor;
        const uri = editor?.document.uri.toString() ?? activeUri;
        if (!uri?.startsWith('lucid:')) {
            return;
        }
        const session = (0, session_store_1.getSession)(uri);
        if (!session) {
            return;
        }
        const text = editor?.document.getText() ?? (0, session_store_1.getDocumentText)(uri) ?? '';
        const result = (0, push_1.pushOverlay)(session, text, 'selected');
        void vscode.window.showInformationMessage(`Lucid: save_selected — ${result.updatedLines} line(s).`);
        (0, session_store_1.putSession)((0, session_1.pullSession)(session, workspaceRoot()));
    }), vscode.commands.registerCommand('lucid.saveAll', async () => {
        const editor = vscode.window.activeTextEditor;
        const uri = editor?.document.uri.toString() ?? activeUri;
        if (!uri?.startsWith('lucid:')) {
            return;
        }
        const session = (0, session_store_1.getSession)(uri);
        if (!session) {
            return;
        }
        const text = editor?.document.getText() ?? (0, session_store_1.getDocumentText)(uri) ?? '';
        const result = (0, push_1.pushOverlay)(session, text, 'all');
        void vscode.window.showInformationMessage(`Lucid: save_all — ${result.updatedLines} line(s).`);
        (0, session_store_1.putSession)((0, session_1.pullSession)(session, workspaceRoot()));
    }), vscode.commands.registerCommand('lucid.discard', async () => {
        const uri = activeUri;
        if (!uri) {
            return;
        }
        const session = (0, session_store_1.getSession)(uri);
        if (!session) {
            return;
        }
        (0, session_store_1.putSession)((0, session_1.pullSession)(session, workspaceRoot()));
        await openVirtualDocument(uri);
    }), vscode.commands.registerCommand('lucid.fork', async () => {
        if (activeUri) {
            await runFork(activeUri);
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(doc => {
        if (doc.uri.scheme !== 'file') {
            return;
        }
        for (const [, session] of (0, session_store_1.allSessions)()) {
            if (session.sourceFilePath === doc.uri.fsPath && activeUri) {
                void vscode.window.showInformationMessage('Lucid: real file saved — run Lucid: Pull to merge.');
            }
        }
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map