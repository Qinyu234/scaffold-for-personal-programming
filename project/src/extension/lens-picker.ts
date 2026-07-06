/**
 * Tier-2 semantic lens picker (drill-in from aggregation cluster).
 */

import * as vscode from 'vscode';
import { analyzeFile } from '../core/analyze';
import { detectLanguage } from '../ingestion/language';
import { listPythonDataNames } from '../projection/data-flow-slice';
import { listEntryPointFunctions } from '../projection/entry-point-slice';
import { listEventFlowStates } from '../projection/event-flow-slice';
import { listImpactStates } from '../projection/impact-slice';

export type LensId =
  | 'open-file'
  | 'def-use'
  | 'entry-point'
  | 'event-flow'
  | 'impact'
  | 'data-flow';

export interface LensHandlers {
  startDefUse: (filePath: string, stateName: string) => Promise<void>;
  startEntryPoint: (filePath: string, entryName: string) => Promise<void>;
  startEventFlow: (filePath: string, stateName: string) => Promise<void>;
  startImpact: (filePath: string, stateName: string) => Promise<void>;
  startDataFlow: (filePath: string, dataName: string) => Promise<void>;
}

function lensOptions(filePath: string): { id: LensId; label: string }[] {
  const lang = detectLanguage(filePath);
  const options: { id: LensId; label: string }[] = [
    { id: 'open-file', label: 'Open source file' },
  ];
  if (lang === 'typescript') {
    options.push(
      { id: 'def-use', label: 'Def-Use (state)' },
      { id: 'entry-point', label: 'Entry Point (function)' },
      { id: 'event-flow', label: 'Event Flow (state)' },
      { id: 'impact', label: 'Impact (state)' },
    );
  }
  if (lang === 'python') {
    options.push(
      { id: 'data-flow', label: 'Data Flow (variable)' },
      { id: 'impact', label: 'Impact (state)' },
    );
  }
  return options;
}

export async function runSemanticLensPicker(
  filePath: string,
  handlers: LensHandlers,
): Promise<void> {
  const pick = await vscode.window.showQuickPick(
    lensOptions(filePath).map(o => ({ label: o.label, id: o.id })),
    { title: `Lucid: analyze ${filePath.split(/[/\\]/).pop()}` },
  );
  if (!pick) {
    return;
  }

  if (pick.id === 'open-file') {
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
    await vscode.window.showTextDocument(doc, { preview: false });
    return;
  }

  if (pick.id === 'def-use') {
    const contracts = analyzeFile(filePath);
    if (contracts.length === 0) {
      void vscode.window.showInformationMessage('Lucid: no state variables found.');
      return;
    }
    const stateName = await vscode.window.showQuickPick(contracts.map(c => c.variableName), {
      title: 'Select state (scopeId)',
    });
    if (stateName) {
      await handlers.startDefUse(filePath, stateName);
    }
    return;
  }

  if (pick.id === 'entry-point') {
    const names = listEntryPointFunctions(filePath);
    if (names.length === 0) {
      void vscode.window.showInformationMessage('Lucid: no functions found.');
      return;
    }
    const entryName = await vscode.window.showQuickPick(names, { title: 'Select entry function' });
    if (entryName) {
      await handlers.startEntryPoint(filePath, entryName);
    }
    return;
  }

  if (pick.id === 'event-flow') {
    const names = listEventFlowStates(filePath);
    if (names.length === 0) {
      void vscode.window.showInformationMessage('Lucid: no state variables found.');
      return;
    }
    const stateName = await vscode.window.showQuickPick(names, { title: 'Select state' });
    if (stateName) {
      await handlers.startEventFlow(filePath, stateName);
    }
    return;
  }

  if (pick.id === 'impact') {
    const names = listImpactStates(filePath);
    if (names.length === 0) {
      void vscode.window.showInformationMessage('Lucid: no state variables found.');
      return;
    }
    const stateName = await vscode.window.showQuickPick(names, { title: 'Select state' });
    if (stateName) {
      await handlers.startImpact(filePath, stateName);
    }
    return;
  }

  if (pick.id === 'data-flow') {
    const names = listPythonDataNames(filePath);
    if (names.length === 0) {
      void vscode.window.showInformationMessage('Lucid: no data variables found.');
      return;
    }
    const dataName = await vscode.window.showQuickPick(names, { title: 'Select data variable' });
    if (dataName) {
      await handlers.startDataFlow(filePath, dataName);
    }
  }
}
