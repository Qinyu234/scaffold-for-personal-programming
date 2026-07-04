/**
 * chokidar watch on real source files backing active Virtual File sessions.
 */

import * as chokidar from 'chokidar';
import * as vscode from 'vscode';
import { allSessions } from './session-store';

let watcher: chokidar.FSWatcher | undefined;

function watchedFiles(): string[] {
  const files = new Set<string>();
  for (const [, session] of allSessions()) {
    files.add(session.sourceFilePath);
    for (const seg of session.document.segments) {
      files.add(seg.sourceFile);
    }
  }
  return [...files];
}

export function syncLucidFileWatch(onChange: (filePath: string) => void): void {
  const paths = watchedFiles();
  if (watcher) {
    void watcher.close();
    watcher = undefined;
  }
  if (paths.length === 0) {
    return;
  }

  watcher = chokidar.watch(paths, { ignoreInitial: true, awaitWriteFinish: { stabilityThreshold: 200 } });
  watcher.on('change', (filePath: string) => onChange(filePath));
}

export function disposeLucidFileWatch(): void {
  if (watcher) {
    void watcher.close();
    watcher = undefined;
  }
}

export function notifySourceChanged(changedPath: string): void {
  void vscode.window
    .showInformationMessage(`Lucid: source changed — ${changedPath}`, 'Pull now')
    .then(choice => {
      if (choice === 'Pull now') {
        void vscode.commands.executeCommand('lucid.pull');
      }
    });
}
