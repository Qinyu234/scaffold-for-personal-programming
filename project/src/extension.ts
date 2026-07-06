/**
 * Lucid VS Code extension — Phase 1.
 */

import * as vscode from 'vscode';
import { detectLanguage, isSupportedSourceFile } from './ingestion/language';
import * as fs from 'fs';
import * as path from 'path';
import { analyzeFile } from './core/analyze';
import { graphFromDefUseSlice, graphFromDataFlowSlice, graphFromEntryPointSlice, graphFromEventFlowSlice, graphFromImpactSlice, graphFromStructureSlice, VIEW_GRAPH_BUILDERS } from './projection/graph';
import { createDataFlowSession, createDefUseSession, createEntryPointSession, createEventFlowSession, createImpactSession, createStructureSession, pullSession, toggleFunctionFold } from './virtual/session';
import { listPythonDataNames } from './projection/data-flow-slice';
import { listEntryPointFunctions } from './projection/entry-point-slice';
import { listEventFlowStates } from './projection/event-flow-slice';
import { listImpactStates } from './projection/impact-slice';
import { createTranslationSession } from './virtual/translation';
import { parseTraceEventsJson } from './virtual/trace-session';
import { applyTraceToSession } from './virtual/trace-apply';
import { traceJsonPath } from './extension/lucid-paths';
import { syncTraceJsonWatch, disposeTraceJsonWatch } from './extension/trace-watch';
import { setOnSessionsChanged } from './extension/session-store';
import { syncLucidFileWatch, disposeLucidFileWatch, notifySourceChanged } from './extension/file-watch';
import { pushOverlay, selectSegmentForFunction } from './virtual/push';
import { forkFunctionInFile, forkFileInDirectory, forkPythonFileCopy, suggestForkName } from './virtual/fork';
import { saveFoldState } from './virtual/fold-store';
import { LucidFileSystemProvider } from './extension/lucid-fs';
import { GraphPanel } from './extension/graph-panel';
import { runSemanticLensPicker } from './extension/lens-picker';
import { filePathForStructureNode, moduleNodeId } from './projection/structure-slice';
import {
  getDocumentText,
  getSession,
  putSession,
  updateSession,
  allSessions,
} from './extension/session-store';

let extContext: vscode.ExtensionContext;
let activeUri: string | undefined;

function workspaceRoot(): string {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? process.cwd();
}

function graphSpecForSession(session: import('./virtual/types').VirtualSession) {
  switch (session.viewType) {
    case 'def-use':
      return graphFromDefUseSlice(session.slice);
    case 'data-flow':
      return graphFromDataFlowSlice(session.slice as import('./projection/data-flow-slice').DataFlowSlice);
    case 'entry-point':
      return graphFromEntryPointSlice(session.slice as import('./projection/entry-point-slice').EntryPointSlice);
    case 'event-flow':
      return graphFromEventFlowSlice(session.slice as import('./projection/event-flow-slice').EventFlowSlice);
    case 'impact':
      return graphFromImpactSlice(session.slice as import('./projection/impact-slice').ImpactSlice);
    case 'structure':
      return graphFromStructureSlice(session.slice as import('./projection/structure-slice').StructureSlice);
    default:
      return undefined;
  }
}

function refreshGraphForActiveSession(): void {
  const uri = activeUri;
  if (!uri) {
    return;
  }
  const session = getSession(uri);
  if (!session) {
    return;
  }
  const spec = graphSpecForSession(session);
  if (spec) {
    GraphPanel.show(extContext, spec, handleGraphMessage(uri));
  }
}

async function mergeTraceIntoActiveSession(events: import('./analysis/trace-overlay').TraceEvent[]): Promise<number> {
  const uri = activeUri;
  const session = uri ? getSession(uri) : undefined;
  if (!session) {
    return 0;
  }
  const updated = applyTraceToSession(session, events, workspaceRoot());
  putSession(updated);
  refreshGraphForActiveSession();
  await openVirtualDocument(uri!);
  return events.length;
}

async function openVirtualDocument(uri: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
  await vscode.window.showTextDocument(doc, { preview: false });
}

function moduleNodeIdFromSession(session: import('./virtual/types').VirtualSession): string {
  const slice = session.slice as import('./projection/structure-slice').StructureSlice;
  return moduleNodeId(slice.moduleName);
}

async function openLucidCluster(filePath: string): Promise<void> {
  if (!isSupportedSourceFile(filePath)) {
    void vscode.window.showWarningMessage('Lucid: open a supported source file first.');
    return;
  }
  await startStructure(filePath);
}

function lensHandlers(): import('./extension/lens-picker').LensHandlers {
  return {
    startDefUse,
    startEntryPoint,
    startEventFlow,
    startImpact,
    startDataFlow,
  };
}

function handleGraphMessage(uri: string) {
  return async (msg: unknown) => {
    const m = msg as { type: string; nodeId?: string; collapseLevel?: number };
    const session = getSession(uri);

    if (session?.viewType === 'structure') {
      if (m.type === 'setCollapseLevel' && typeof m.collapseLevel === 'number') {
        const level = Math.max(0, Math.min(3, m.collapseLevel));
        putSession({ ...session, collapseLevel: level });
        return;
      }
      if (m.type === 'drillIn') {
        const nodeId = m.nodeId ?? moduleNodeIdFromSession(session);
        if (!nodeId) {
          void vscode.window.showWarningMessage('Lucid: select a node in the cluster graph first.');
          return;
        }
        const slice = session.slice as import('./projection/structure-slice').StructureSlice;
        const targetPath = filePathForStructureNode(nodeId, slice);
        if (!targetPath) {
          void vscode.window.showWarningMessage(
            'Lucid: external or unresolved dependency — open the package in the editor manually.',
          );
          return;
        }
        await runSemanticLensPicker(targetPath, lensHandlers());
        return;
      }
    }

    if (m.type === 'openDocument') {
      await openVirtualDocument(uri);
      return;
    }
    if (m.type === 'nodeSelected' && m.nodeId) {
      const s = getSession(uri);
      if (!s) {
        return;
      }
      const seg = s.document.segments.find(x => m.nodeId!.includes(String(x.sourceLine)));
      if (seg && seg.enclosingFunction !== '<module>') {
        updateSession(uri, selectSegmentForFunction(s, seg.enclosingFunction));
      }
      return;
    }
    if (m.type === 'rebind') {
      const confirm = await vscode.window.showWarningMessage(
        'Lucid: confirm rebind? (never automatic)',
        { modal: true },
        'Confirm',
      );
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

async function runFork(uri: string): Promise<void> {
  const session = getSession(uri);
  if (!session) {
    return;
  }
  const kind = await vscode.window.showQuickPick(['function', 'file'], { title: 'Fork kind' });
  if (!kind) {
    return;
  }
  const defaultName = suggestForkName(session.scopeId, kind as 'function' | 'file');
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
    const result = forkFunctionInFile(session.sourceFilePath, fn, name);
    if (result) {
      void vscode.window.showInformationMessage(`Lucid: forked ${name} in same file.`);
    }
  } else {
    const result = path.extname(session.sourceFilePath) === '.py'
      ? forkPythonFileCopy(session.sourceFilePath, name)
      : forkFileInDirectory(session.sourceFilePath, name);
    if (result) {
      void vscode.window.showInformationMessage(`Lucid: fork → ${result.targetPath}`);
    }
  }
}

async function startTranslation(filePath: string, scopeId: string): Promise<void> {
  const session = createTranslationSession(
    { sourceFile: filePath, scopeId, targetLang: 'cpp' },
    workspaceRoot(),
  );
  const uri = putSession(session);
  activeUri = uri;
  await openVirtualDocument(uri);
  void vscode.window.showInformationMessage(
    'Lucid: translation scaffold (Python→C++). Source untouched until you copy/push manually.',
  );
}

async function startStructure(filePath: string): Promise<void> {
  const session = createStructureSession(filePath, workspaceRoot());
  if (!session) {
    void vscode.window.showWarningMessage('Lucid: no structure slice for this file.');
    return;
  }
  const uri = putSession(session);
  activeUri = uri;
  const spec = graphFromStructureSlice(
    session.slice as import('./projection/structure-slice').StructureSlice,
    session.collapseLevel ?? 0,
  );
  GraphPanel.show(extContext, spec, handleGraphMessage(uri));
  await openVirtualDocument(uri);
}

async function startImpact(filePath: string, stateName: string): Promise<void> {
  const session = createImpactSession(filePath, stateName, workspaceRoot());
  if (!session) {
    void vscode.window.showWarningMessage(`Lucid: no impact slice for "${stateName}".`);
    return;
  }
  const uri = putSession(session);
  activeUri = uri;
  const spec = graphFromImpactSlice(session.slice as import('./projection/impact-slice').ImpactSlice);
  GraphPanel.show(extContext, spec, handleGraphMessage(uri));
  await openVirtualDocument(uri);
}

async function startEventFlow(filePath: string, stateName: string): Promise<void> {
  const session = createEventFlowSession(filePath, stateName, workspaceRoot());
  if (!session) {
    void vscode.window.showWarningMessage(`Lucid: no event-flow slice for "${stateName}".`);
    return;
  }
  const uri = putSession(session);
  activeUri = uri;
  const spec = graphFromEventFlowSlice(session.slice as import('./projection/event-flow-slice').EventFlowSlice);
  GraphPanel.show(extContext, spec, handleGraphMessage(uri));
  await openVirtualDocument(uri);
}

async function startEntryPoint(filePath: string, entryName: string): Promise<void> {
  const session = createEntryPointSession(filePath, entryName, workspaceRoot());
  if (!session) {
    void vscode.window.showWarningMessage(`Lucid: no entry-point slice for "${entryName}".`);
    return;
  }
  const uri = putSession(session);
  activeUri = uri;
  const spec = graphFromEntryPointSlice(session.slice as import('./projection/entry-point-slice').EntryPointSlice);
  GraphPanel.show(extContext, spec, handleGraphMessage(uri));
  await openVirtualDocument(uri);
}

async function startDataFlow(filePath: string, dataName: string): Promise<void> {
  const session = createDataFlowSession(filePath, dataName, workspaceRoot());
  if (!session) {
    void vscode.window.showWarningMessage(`Lucid: no data-flow slice for "${dataName}".`);
    return;
  }
  const uri = putSession(session);
  activeUri = uri;
  const spec = graphFromDataFlowSlice(session.slice as import('./projection/data-flow-slice').DataFlowSlice);
  GraphPanel.show(extContext, spec, handleGraphMessage(uri));
  await openVirtualDocument(uri);
}

async function startDefUse(filePath: string, stateName: string): Promise<void> {
  const session = createDefUseSession(filePath, stateName, workspaceRoot());
  if (!session) {
    void vscode.window.showWarningMessage(`Lucid: no slice for "${stateName}".`);
    return;
  }
  const uri = putSession(session);
  activeUri = uri;
  const spec = graphFromDefUseSlice(session.slice);
  GraphPanel.show(extContext, spec, handleGraphMessage(uri));
  await openVirtualDocument(uri);
}

export function activate(context: vscode.ExtensionContext): void {
  extContext = context;
  const root = workspaceRoot();
  setOnSessionsChanged(() => syncLucidFileWatch(notifySourceChanged));
  syncTraceJsonWatch(root, ({ eventCount, sessionCount }) => {
    if (sessionCount > 0) {
      refreshGraphForActiveSession();
      void vscode.window.showInformationMessage(
        `Lucid: auto-loaded ${eventCount} trace event(s) from .lucid/trace.json (${sessionCount} session(s)).`,
      );
    }
  });
  context.subscriptions.push({
    dispose: () => {
      disposeLucidFileWatch();
      disposeTraceJsonWatch();
    },
  });
  const fsProvider = new LucidFileSystemProvider();
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('lucid', fsProvider, { isCaseSensitive: true }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('lucid.open', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Lucid: no active editor.');
        return;
      }
      await openLucidCluster(editor.document.uri.fsPath);
    }),

    vscode.commands.registerCommand('lucid.openDefUse', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Lucid: no active editor.');
        return;
      }
      const contracts = analyzeFile(editor.document.uri.fsPath);
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
    }),

    vscode.commands.registerCommand('lucid.openEventFlow', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Lucid: no active editor.');
        return;
      }
      const filePath = editor.document.uri.fsPath;
      if (detectLanguage(filePath) !== 'typescript') {
        void vscode.window.showWarningMessage('Lucid: Event Flow View requires a JS/TS file.');
        return;
      }
      const names = listEventFlowStates(filePath);
      if (names.length === 0) {
        void vscode.window.showInformationMessage('Lucid: no state variables found.');
        return;
      }
      const stateName = await vscode.window.showQuickPick(names, { title: 'Select state (scopeId)' });
      if (stateName) {
        await startEventFlow(filePath, stateName);
      }
    }),

    vscode.commands.registerCommand('lucid.openEntryPoint', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Lucid: no active editor.');
        return;
      }
      const filePath = editor.document.uri.fsPath;
      if (detectLanguage(filePath) !== 'typescript') {
        void vscode.window.showWarningMessage('Lucid: Entry Point View requires a JS/TS file.');
        return;
      }
      const names = listEntryPointFunctions(filePath);
      if (names.length === 0) {
        void vscode.window.showInformationMessage('Lucid: no functions found.');
        return;
      }
      const entryName = await vscode.window.showQuickPick(names, { title: 'Select entry function (scopeId)' });
      if (entryName) {
        await startEntryPoint(filePath, entryName);
      }
    }),

    vscode.commands.registerCommand('lucid.openDataFlow', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Lucid: no active editor.');
        return;
      }
      const filePath = editor.document.uri.fsPath;
      if (detectLanguage(filePath) !== 'python') {
        void vscode.window.showWarningMessage('Lucid: Data Flow View requires a Python file (DESIGN Phase 1).');
        return;
      }
      const names = listPythonDataNames(filePath);
      if (names.length === 0) {
        void vscode.window.showInformationMessage('Lucid: no data variables found.');
        return;
      }
      const dataName = await vscode.window.showQuickPick(names, { title: 'Select data (scopeId)' });
      if (dataName) {
        await startDataFlow(filePath, dataName);
      }
    }),

    vscode.commands.registerCommand('lucid.loadTraceOverlay', async () => {
      const uri = activeUri;
      const session = uri ? getSession(uri) : undefined;
      if (!session) {
        void vscode.window.showWarningMessage('Lucid: open a Virtual File session first.');
        return;
      }
      const defaultPath = traceJsonPath(workspaceRoot());
      let text: string | undefined;
      if (fs.existsSync(defaultPath)) {
        text = fs.readFileSync(defaultPath, 'utf8');
      } else {
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
        const events = parseTraceEventsJson(text);
        const count = await mergeTraceIntoActiveSession(events);
        void vscode.window.showInformationMessage(`Lucid: merged ${count} trace event(s).`);
      } catch (e) {
        void vscode.window.showErrorMessage(`Lucid: trace load failed — ${e}`);
      }
    }),

    vscode.commands.registerCommand('lucid.openTranslation', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Lucid: no active editor.');
        return;
      }
      const filePath = editor.document.uri.fsPath;
      if (detectLanguage(filePath) !== 'python') {
        void vscode.window.showWarningMessage('Lucid: Translation requires a Python file (Phase 2).');
        return;
      }
      const names = listPythonDataNames(filePath);
      if (names.length === 0) {
        void vscode.window.showInformationMessage('Lucid: no Python variables found.');
        return;
      }
      const scopeId = await vscode.window.showQuickPick(names, { title: 'Translation scopeId' });
      if (scopeId) {
        await startTranslation(filePath, scopeId);
      }
    }),

    vscode.commands.registerCommand('lucid.openStructure', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Lucid: no active editor.');
        return;
      }
      await openLucidCluster(editor.document.uri.fsPath);
    }),

    vscode.commands.registerCommand('lucid.openImpact', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Lucid: no active editor.');
        return;
      }
      const filePath = editor.document.uri.fsPath;
      const lang = detectLanguage(filePath);
      if (lang !== 'typescript' && lang !== 'python') {
        void vscode.window.showWarningMessage('Lucid: Impact View requires JS/TS or Python.');
        return;
      }
      const names = listImpactStates(filePath);
      if (names.length === 0) {
        void vscode.window.showInformationMessage('Lucid: no state variables found.');
        return;
      }
      const stateName = await vscode.window.showQuickPick(names, { title: 'Select state (scopeId)' });
      if (stateName) {
        await startImpact(filePath, stateName);
      }
    }),

    vscode.commands.registerCommand('lucid.analyzeState', () => vscode.commands.executeCommand('lucid.openDefUse')),

    vscode.commands.registerCommand('lucid.openView', async () => {
      const tier = await vscode.window.showQuickPick(
        [
          { label: 'Cluster from active file (default)', id: 'cluster' },
          { label: 'Semantic lens (direct)', id: 'semantic' },
        ],
        { title: 'Lucid' },
      );
      if (!tier) {
        return;
      }
      if (tier.id === 'cluster') {
        await vscode.commands.executeCommand('lucid.open');
        return;
      }
      const viewType = await vscode.window.showQuickPick(
        ['def-use', 'entry-point', 'impact', 'structure', 'event-flow', 'data-flow'],
        { title: 'Lucid view' },
      );
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
      const builder = VIEW_GRAPH_BUILDERS[viewType];
      if (builder) {
        GraphPanel.show(extContext, builder(scopeId), () => undefined);
      }
    }),

    vscode.commands.registerCommand('lucid.pull', async () => {
      const uri = activeUri;
      const session = uri ? getSession(uri) : undefined;
      if (!session) {
        return;
      }
      const choice = await vscode.window.showWarningMessage(
        'Lucid: source changed — choose merge strategy',
        { modal: true },
        'Keep virtual edits',
        'Discard virtual edits',
      );
      const pulled = pullSession(session, workspaceRoot());
      if (choice === 'Discard virtual edits') {
        putSession(pulled);
        await openVirtualDocument(uri!);
      } else if (choice === 'Keep virtual edits') {
        pulled.document.text = getDocumentText(uri!) ?? pulled.document.text;
        putSession(pulled);
      }
    }),

    vscode.commands.registerCommand('lucid.toggleFold', async () => {
      const uri = activeUri;
      const session = uri ? getSession(uri) : undefined;
      if (!session) {
        return;
      }
      const fns = [...new Set(session.document.segments.map(s => s.enclosingFunction).filter(f => f !== '<module>'))];
      const pick = await vscode.window.showQuickPick(fns, { title: 'Toggle fold' });
      if (!pick) {
        return;
      }
      const toggled = toggleFunctionFold(session, pick);
      saveFoldState(workspaceRoot(), session.scopeId, toggled.collapsedFunctions);
      putSession(toggled);
      await openVirtualDocument(uri!);
    }),

    vscode.commands.registerCommand('lucid.saveSelected', async () => {
      const editor = vscode.window.activeTextEditor;
      const uri = editor?.document.uri.toString() ?? activeUri;
      if (!uri?.startsWith('lucid:')) {
        return;
      }
      const session = getSession(uri);
      if (!session) {
        return;
      }
      const text = editor?.document.getText() ?? getDocumentText(uri) ?? '';
      const result = pushOverlay(session, text, 'selected');
      void vscode.window.showInformationMessage(`Lucid: save_selected — ${result.updatedLines} line(s).`);
      putSession(pullSession(session, workspaceRoot()));
    }),

    vscode.commands.registerCommand('lucid.saveAll', async () => {
      const editor = vscode.window.activeTextEditor;
      const uri = editor?.document.uri.toString() ?? activeUri;
      if (!uri?.startsWith('lucid:')) {
        return;
      }
      const session = getSession(uri);
      if (!session) {
        return;
      }
      const text = editor?.document.getText() ?? getDocumentText(uri) ?? '';
      const result = pushOverlay(session, text, 'all');
      void vscode.window.showInformationMessage(`Lucid: save_all — ${result.updatedLines} line(s).`);
      putSession(pullSession(session, workspaceRoot()));
    }),

    vscode.commands.registerCommand('lucid.discard', async () => {
      const uri = activeUri;
      if (!uri) {
        return;
      }
      const session = getSession(uri);
      if (!session) {
        return;
      }
      putSession(pullSession(session, workspaceRoot()));
      await openVirtualDocument(uri);
    }),

    vscode.commands.registerCommand('lucid.fork', async () => {
      if (activeUri) {
        await runFork(activeUri);
      }
    }),
  );

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(doc => {
      if (doc.uri.scheme !== 'file') {
        return;
      }
      for (const [, session] of allSessions()) {
        if (session.sourceFilePath === doc.uri.fsPath && activeUri) {
          void vscode.window.showInformationMessage('Lucid: real file saved — run Lucid: Pull to merge.');
        }
      }
    }),
  );
}

export function deactivate(): void {
  disposeLucidFileWatch();
  disposeTraceJsonWatch();
}
