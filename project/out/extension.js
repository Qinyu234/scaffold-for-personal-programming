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
const language_1 = require("./ingestion/language");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const analyze_1 = require("./core/analyze");
const graph_1 = require("./projection/graph");
const session_1 = require("./virtual/session");
const data_flow_slice_1 = require("./projection/data-flow-slice");
const entry_point_slice_1 = require("./projection/entry-point-slice");
const event_flow_slice_1 = require("./projection/event-flow-slice");
const impact_slice_1 = require("./projection/impact-slice");
const translation_1 = require("./virtual/translation");
const trace_session_1 = require("./virtual/trace-session");
const trace_apply_1 = require("./virtual/trace-apply");
const lucid_paths_1 = require("./extension/lucid-paths");
const trace_watch_1 = require("./extension/trace-watch");
const session_store_1 = require("./extension/session-store");
const file_watch_1 = require("./extension/file-watch");
const push_1 = require("./virtual/push");
const fork_1 = require("./virtual/fork");
const fold_store_1 = require("./virtual/fold-store");
const lucid_fs_1 = require("./extension/lucid-fs");
const graph_panel_1 = require("./extension/graph-panel");
const lens_picker_1 = require("./extension/lens-picker");
const structure_slice_1 = require("./projection/structure-slice");
const session_store_2 = require("./extension/session-store");
let extContext;
let activeUri;
function workspaceRoot() {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}
function graphSpecForSession(session) {
    switch (session.viewType) {
        case 'def-use':
            return (0, graph_1.graphFromDefUseSlice)(session.slice);
        case 'data-flow':
            return (0, graph_1.graphFromDataFlowSlice)(session.slice);
        case 'entry-point':
            return (0, graph_1.graphFromEntryPointSlice)(session.slice);
        case 'event-flow':
            return (0, graph_1.graphFromEventFlowSlice)(session.slice);
        case 'impact':
            return (0, graph_1.graphFromImpactSlice)(session.slice);
        case 'structure':
            return (0, graph_1.graphFromStructureSlice)(session.slice);
        default:
            return undefined;
    }
}
function refreshGraphForActiveSession() {
    const uri = activeUri;
    if (!uri) {
        return;
    }
    const session = (0, session_store_2.getSession)(uri);
    if (!session) {
        return;
    }
    const spec = graphSpecForSession(session);
    if (spec) {
        graph_panel_1.GraphPanel.show(extContext, spec, handleGraphMessage(uri));
    }
}
async function mergeTraceIntoActiveSession(events) {
    const uri = activeUri;
    const session = uri ? (0, session_store_2.getSession)(uri) : undefined;
    if (!session) {
        return 0;
    }
    const updated = (0, trace_apply_1.applyTraceToSession)(session, events, workspaceRoot());
    (0, session_store_2.putSession)(updated);
    refreshGraphForActiveSession();
    await openVirtualDocument(uri);
    return events.length;
}
async function openVirtualDocument(uri) {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
    await vscode.window.showTextDocument(doc, { preview: false });
}
function moduleNodeIdFromSession(session) {
    const slice = session.slice;
    return (0, structure_slice_1.moduleNodeId)(slice.moduleName);
}
async function openLucidCluster(filePath) {
    if (!(0, language_1.isSupportedSourceFile)(filePath)) {
        void vscode.window.showWarningMessage('Lucid: open a supported source file first.');
        return;
    }
    await startStructure(filePath);
}
function lensHandlers() {
    return {
        startDefUse,
        startEntryPoint,
        startEventFlow,
        startImpact,
        startDataFlow,
    };
}
function handleGraphMessage(uri) {
    return async (msg) => {
        const m = msg;
        const session = (0, session_store_2.getSession)(uri);
        if (session?.viewType === 'structure') {
            if (m.type === 'setCollapseLevel' && typeof m.collapseLevel === 'number') {
                const level = Math.max(0, Math.min(3, m.collapseLevel));
                (0, session_store_2.putSession)({ ...session, collapseLevel: level });
                return;
            }
            if (m.type === 'drillIn') {
                const nodeId = m.nodeId ?? moduleNodeIdFromSession(session);
                if (!nodeId) {
                    void vscode.window.showWarningMessage('Lucid: select a node in the cluster graph first.');
                    return;
                }
                const slice = session.slice;
                const targetPath = (0, structure_slice_1.filePathForStructureNode)(nodeId, slice);
                if (!targetPath) {
                    void vscode.window.showWarningMessage('Lucid: external or unresolved dependency — open the package in the editor manually.');
                    return;
                }
                await (0, lens_picker_1.runSemanticLensPicker)(targetPath, lensHandlers());
                return;
            }
        }
        if (m.type === 'openDocument') {
            await openVirtualDocument(uri);
            return;
        }
        if (m.type === 'nodeSelected' && m.nodeId) {
            const s = (0, session_store_2.getSession)(uri);
            if (!s) {
                return;
            }
            const seg = s.document.segments.find(x => m.nodeId.includes(String(x.sourceLine)));
            if (seg && seg.enclosingFunction !== '<module>') {
                (0, session_store_2.updateSession)(uri, (0, push_1.selectSegmentForFunction)(s, seg.enclosingFunction));
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
    const session = (0, session_store_2.getSession)(uri);
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
async function startTranslation(filePath, scopeId) {
    const session = (0, translation_1.createTranslationSession)({ sourceFile: filePath, scopeId, targetLang: 'cpp' }, workspaceRoot());
    const uri = (0, session_store_2.putSession)(session);
    activeUri = uri;
    await openVirtualDocument(uri);
    void vscode.window.showInformationMessage('Lucid: translation scaffold (Python→C++). Source untouched until you copy/push manually.');
}
async function startStructure(filePath) {
    const session = (0, session_1.createStructureSession)(filePath, workspaceRoot());
    if (!session) {
        void vscode.window.showWarningMessage('Lucid: no structure slice for this file.');
        return;
    }
    const uri = (0, session_store_2.putSession)(session);
    activeUri = uri;
    const spec = (0, graph_1.graphFromStructureSlice)(session.slice, session.collapseLevel ?? 0);
    graph_panel_1.GraphPanel.show(extContext, spec, handleGraphMessage(uri));
    await openVirtualDocument(uri);
}
async function startImpact(filePath, stateName) {
    const session = (0, session_1.createImpactSession)(filePath, stateName, workspaceRoot());
    if (!session) {
        void vscode.window.showWarningMessage(`Lucid: no impact slice for "${stateName}".`);
        return;
    }
    const uri = (0, session_store_2.putSession)(session);
    activeUri = uri;
    const spec = (0, graph_1.graphFromImpactSlice)(session.slice);
    graph_panel_1.GraphPanel.show(extContext, spec, handleGraphMessage(uri));
    await openVirtualDocument(uri);
}
async function startEventFlow(filePath, stateName) {
    const session = (0, session_1.createEventFlowSession)(filePath, stateName, workspaceRoot());
    if (!session) {
        void vscode.window.showWarningMessage(`Lucid: no event-flow slice for "${stateName}".`);
        return;
    }
    const uri = (0, session_store_2.putSession)(session);
    activeUri = uri;
    const spec = (0, graph_1.graphFromEventFlowSlice)(session.slice);
    graph_panel_1.GraphPanel.show(extContext, spec, handleGraphMessage(uri));
    await openVirtualDocument(uri);
}
async function startEntryPoint(filePath, entryName) {
    const session = (0, session_1.createEntryPointSession)(filePath, entryName, workspaceRoot());
    if (!session) {
        void vscode.window.showWarningMessage(`Lucid: no entry-point slice for "${entryName}".`);
        return;
    }
    const uri = (0, session_store_2.putSession)(session);
    activeUri = uri;
    const spec = (0, graph_1.graphFromEntryPointSlice)(session.slice);
    graph_panel_1.GraphPanel.show(extContext, spec, handleGraphMessage(uri));
    await openVirtualDocument(uri);
}
async function startDataFlow(filePath, dataName) {
    const session = (0, session_1.createDataFlowSession)(filePath, dataName, workspaceRoot());
    if (!session) {
        void vscode.window.showWarningMessage(`Lucid: no data-flow slice for "${dataName}".`);
        return;
    }
    const uri = (0, session_store_2.putSession)(session);
    activeUri = uri;
    const spec = (0, graph_1.graphFromDataFlowSlice)(session.slice);
    graph_panel_1.GraphPanel.show(extContext, spec, handleGraphMessage(uri));
    await openVirtualDocument(uri);
}
async function startDefUse(filePath, stateName) {
    const session = (0, session_1.createDefUseSession)(filePath, stateName, workspaceRoot());
    if (!session) {
        void vscode.window.showWarningMessage(`Lucid: no slice for "${stateName}".`);
        return;
    }
    const uri = (0, session_store_2.putSession)(session);
    activeUri = uri;
    const spec = (0, graph_1.graphFromDefUseSlice)(session.slice);
    graph_panel_1.GraphPanel.show(extContext, spec, handleGraphMessage(uri));
    await openVirtualDocument(uri);
}
function activate(context) {
    extContext = context;
    const root = workspaceRoot();
    (0, session_store_1.setOnSessionsChanged)(() => (0, file_watch_1.syncLucidFileWatch)(file_watch_1.notifySourceChanged));
    (0, trace_watch_1.syncTraceJsonWatch)(root, ({ eventCount, sessionCount }) => {
        if (sessionCount > 0) {
            refreshGraphForActiveSession();
            void vscode.window.showInformationMessage(`Lucid: auto-loaded ${eventCount} trace event(s) from .lucid/trace.json (${sessionCount} session(s)).`);
        }
    });
    context.subscriptions.push({
        dispose: () => {
            (0, file_watch_1.disposeLucidFileWatch)();
            (0, trace_watch_1.disposeTraceJsonWatch)();
        },
    });
    const fsProvider = new lucid_fs_1.LucidFileSystemProvider();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider('lucid', fsProvider, { isCaseSensitive: true }));
    context.subscriptions.push(vscode.commands.registerCommand('lucid.open', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showWarningMessage('Lucid: no active editor.');
            return;
        }
        await openLucidCluster(editor.document.uri.fsPath);
    }), vscode.commands.registerCommand('lucid.openDefUse', async () => {
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
    }), vscode.commands.registerCommand('lucid.openEventFlow', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showWarningMessage('Lucid: no active editor.');
            return;
        }
        const filePath = editor.document.uri.fsPath;
        if ((0, language_1.detectLanguage)(filePath) !== 'typescript') {
            void vscode.window.showWarningMessage('Lucid: Event Flow View requires a JS/TS file.');
            return;
        }
        const names = (0, event_flow_slice_1.listEventFlowStates)(filePath);
        if (names.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no state variables found.');
            return;
        }
        const stateName = await vscode.window.showQuickPick(names, { title: 'Select state (scopeId)' });
        if (stateName) {
            await startEventFlow(filePath, stateName);
        }
    }), vscode.commands.registerCommand('lucid.openEntryPoint', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showWarningMessage('Lucid: no active editor.');
            return;
        }
        const filePath = editor.document.uri.fsPath;
        if ((0, language_1.detectLanguage)(filePath) !== 'typescript') {
            void vscode.window.showWarningMessage('Lucid: Entry Point View requires a JS/TS file.');
            return;
        }
        const names = (0, entry_point_slice_1.listEntryPointFunctions)(filePath);
        if (names.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no functions found.');
            return;
        }
        const entryName = await vscode.window.showQuickPick(names, { title: 'Select entry function (scopeId)' });
        if (entryName) {
            await startEntryPoint(filePath, entryName);
        }
    }), vscode.commands.registerCommand('lucid.openDataFlow', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showWarningMessage('Lucid: no active editor.');
            return;
        }
        const filePath = editor.document.uri.fsPath;
        if ((0, language_1.detectLanguage)(filePath) !== 'python') {
            void vscode.window.showWarningMessage('Lucid: Data Flow View requires a Python file (DESIGN Phase 1).');
            return;
        }
        const names = (0, data_flow_slice_1.listPythonDataNames)(filePath);
        if (names.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no data variables found.');
            return;
        }
        const dataName = await vscode.window.showQuickPick(names, { title: 'Select data (scopeId)' });
        if (dataName) {
            await startDataFlow(filePath, dataName);
        }
    }), vscode.commands.registerCommand('lucid.loadTraceOverlay', async () => {
        const uri = activeUri;
        const session = uri ? (0, session_store_2.getSession)(uri) : undefined;
        if (!session) {
            void vscode.window.showWarningMessage('Lucid: open a Virtual File session first.');
            return;
        }
        const defaultPath = (0, lucid_paths_1.traceJsonPath)(workspaceRoot());
        let text;
        if (fs.existsSync(defaultPath)) {
            text = fs.readFileSync(defaultPath, 'utf8');
        }
        else {
            const picks = await vscode.window.showOpenDialog({
                canSelectMany: false,
                filters: { JSON: ['json'] },
                title: 'Select trace events JSON (default: .lucid/trace.json)',
            });
            if (!picks?.[0]) {
                return;
            }
            text = fs.readFileSync(picks[0].fsPath, 'utf8');
        }
        try {
            const events = (0, trace_session_1.parseTraceEventsJson)(text);
            const count = await mergeTraceIntoActiveSession(events);
            void vscode.window.showInformationMessage(`Lucid: merged ${count} trace event(s).`);
        }
        catch (e) {
            void vscode.window.showErrorMessage(`Lucid: trace load failed — ${e}`);
        }
    }), vscode.commands.registerCommand('lucid.openTranslation', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showWarningMessage('Lucid: no active editor.');
            return;
        }
        const filePath = editor.document.uri.fsPath;
        if ((0, language_1.detectLanguage)(filePath) !== 'python') {
            void vscode.window.showWarningMessage('Lucid: Translation requires a Python file (Phase 2).');
            return;
        }
        const names = (0, data_flow_slice_1.listPythonDataNames)(filePath);
        if (names.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no Python variables found.');
            return;
        }
        const scopeId = await vscode.window.showQuickPick(names, { title: 'Translation scopeId' });
        if (scopeId) {
            await startTranslation(filePath, scopeId);
        }
    }), vscode.commands.registerCommand('lucid.openStructure', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showWarningMessage('Lucid: no active editor.');
            return;
        }
        await openLucidCluster(editor.document.uri.fsPath);
    }), vscode.commands.registerCommand('lucid.openImpact', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showWarningMessage('Lucid: no active editor.');
            return;
        }
        const filePath = editor.document.uri.fsPath;
        const lang = (0, language_1.detectLanguage)(filePath);
        if (lang !== 'typescript' && lang !== 'python') {
            void vscode.window.showWarningMessage('Lucid: Impact View requires JS/TS or Python.');
            return;
        }
        const names = (0, impact_slice_1.listImpactStates)(filePath);
        if (names.length === 0) {
            void vscode.window.showInformationMessage('Lucid: no state variables found.');
            return;
        }
        const stateName = await vscode.window.showQuickPick(names, { title: 'Select state (scopeId)' });
        if (stateName) {
            await startImpact(filePath, stateName);
        }
    }), vscode.commands.registerCommand('lucid.analyzeState', () => vscode.commands.executeCommand('lucid.openDefUse')), vscode.commands.registerCommand('lucid.openView', async () => {
        const tier = await vscode.window.showQuickPick([
            { label: 'Cluster from active file (default)', id: 'cluster' },
            { label: 'Semantic lens (direct)', id: 'semantic' },
        ], { title: 'Lucid' });
        if (!tier) {
            return;
        }
        if (tier.id === 'cluster') {
            await vscode.commands.executeCommand('lucid.open');
            return;
        }
        const viewType = await vscode.window.showQuickPick(['def-use', 'entry-point', 'impact', 'structure', 'event-flow', 'data-flow'], { title: 'Lucid view' });
        if (!viewType) {
            return;
        }
        if (viewType === 'def-use') {
            await vscode.commands.executeCommand('lucid.openDefUse');
            return;
        }
        if (viewType === 'data-flow') {
            await vscode.commands.executeCommand('lucid.openDataFlow');
            return;
        }
        if (viewType === 'entry-point') {
            await vscode.commands.executeCommand('lucid.openEntryPoint');
            return;
        }
        if (viewType === 'event-flow') {
            await vscode.commands.executeCommand('lucid.openEventFlow');
            return;
        }
        if (viewType === 'impact') {
            await vscode.commands.executeCommand('lucid.openImpact');
            return;
        }
        if (viewType === 'structure') {
            await vscode.commands.executeCommand('lucid.openStructure');
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
        const session = uri ? (0, session_store_2.getSession)(uri) : undefined;
        if (!session) {
            return;
        }
        const choice = await vscode.window.showWarningMessage('Lucid: source changed — choose merge strategy', { modal: true }, 'Keep virtual edits', 'Discard virtual edits');
        const pulled = (0, session_1.pullSession)(session, workspaceRoot());
        if (choice === 'Discard virtual edits') {
            (0, session_store_2.putSession)(pulled);
            await openVirtualDocument(uri);
        }
        else if (choice === 'Keep virtual edits') {
            pulled.document.text = (0, session_store_2.getDocumentText)(uri) ?? pulled.document.text;
            (0, session_store_2.putSession)(pulled);
        }
    }), vscode.commands.registerCommand('lucid.toggleFold', async () => {
        const uri = activeUri;
        const session = uri ? (0, session_store_2.getSession)(uri) : undefined;
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
        (0, session_store_2.putSession)(toggled);
        await openVirtualDocument(uri);
    }), vscode.commands.registerCommand('lucid.saveSelected', async () => {
        const editor = vscode.window.activeTextEditor;
        const uri = editor?.document.uri.toString() ?? activeUri;
        if (!uri?.startsWith('lucid:')) {
            return;
        }
        const session = (0, session_store_2.getSession)(uri);
        if (!session) {
            return;
        }
        const text = editor?.document.getText() ?? (0, session_store_2.getDocumentText)(uri) ?? '';
        const result = (0, push_1.pushOverlay)(session, text, 'selected');
        void vscode.window.showInformationMessage(`Lucid: save_selected — ${result.updatedLines} line(s).`);
        (0, session_store_2.putSession)((0, session_1.pullSession)(session, workspaceRoot()));
    }), vscode.commands.registerCommand('lucid.saveAll', async () => {
        const editor = vscode.window.activeTextEditor;
        const uri = editor?.document.uri.toString() ?? activeUri;
        if (!uri?.startsWith('lucid:')) {
            return;
        }
        const session = (0, session_store_2.getSession)(uri);
        if (!session) {
            return;
        }
        const text = editor?.document.getText() ?? (0, session_store_2.getDocumentText)(uri) ?? '';
        const result = (0, push_1.pushOverlay)(session, text, 'all');
        void vscode.window.showInformationMessage(`Lucid: save_all — ${result.updatedLines} line(s).`);
        (0, session_store_2.putSession)((0, session_1.pullSession)(session, workspaceRoot()));
    }), vscode.commands.registerCommand('lucid.discard', async () => {
        const uri = activeUri;
        if (!uri) {
            return;
        }
        const session = (0, session_store_2.getSession)(uri);
        if (!session) {
            return;
        }
        (0, session_store_2.putSession)((0, session_1.pullSession)(session, workspaceRoot()));
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
        for (const [, session] of (0, session_store_2.allSessions)()) {
            if (session.sourceFilePath === doc.uri.fsPath && activeUri) {
                void vscode.window.showInformationMessage('Lucid: real file saved — run Lucid: Pull to merge.');
            }
        }
    }));
}
function deactivate() {
    (0, file_watch_1.disposeLucidFileWatch)();
    (0, trace_watch_1.disposeTraceJsonWatch)();
}
//# sourceMappingURL=extension.js.map