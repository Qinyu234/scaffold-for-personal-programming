/**
 * Lucid VS Code extension — Phase 1.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { analyzeFile } from './core/analyze';
import { graphFromDefUseSlice, VIEW_GRAPH_BUILDERS } from './projection/graph';
import { createDefUseSession, pullSession, toggleFunctionFold } from './virtual/session';
import { pushOverlay, selectSegmentForFunction } from './virtual/push';
import { forkFunctionInFile, forkFileInDirectory, forkPythonFileCopy, suggestForkName } from './virtual/fork';
import { saveFoldState } from './virtual/fold-store';
import { LucidFileSystemProvider } from './extension/lucid-fs';
import { GraphPanel } from './extension/graph-panel';
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

async function openVirtualDocument(uri: string): Promise<void> {
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(uri));
  await vscode.window.showTextDocument(doc, { preview: false });
}

function handleGraphMessage(uri: string) {
  return async (msg: unknown) => {
    const m = msg as { type: string; nodeId?: string };
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
  const fsProvider = new LucidFileSystemProvider();
  context.subscriptions.push(
    vscode.workspace.registerFileSystemProvider('lucid', fsProvider, { isCaseSensitive: true }),
  );

  context.subscriptions.push(
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

    vscode.commands.registerCommand('lucid.analyzeState', () => vscode.commands.executeCommand('lucid.openDefUse')),

    vscode.commands.registerCommand('lucid.openView', async () => {
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

export function deactivate(): void {}
