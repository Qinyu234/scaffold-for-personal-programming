/**
 * lucid:// FileSystemProvider — editable Virtual File copies.
 */

import * as vscode from 'vscode';
import {
  getDocumentText,
  getSession,
  setDocumentText,
} from './session-store';

export class LucidFileSystemProvider implements vscode.FileSystemProvider {
  private readonly emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  readonly onDidChangeFile = this.emitter.event;

  watch(): vscode.Disposable {
    return new vscode.Disposable(() => undefined);
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const text = getDocumentText(uri.toString());
    if (text === undefined) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    return {
      type: vscode.FileType.File,
      ctime: Date.now(),
      mtime: Date.now(),
      size: Buffer.byteLength(text, 'utf8'),
    };
  }

  readDirectory(): [string, vscode.FileType][] {
    return [];
  }

  createDirectory(): void {
    throw vscode.FileSystemError.NoPermissions('createDirectory');
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const text = getDocumentText(uri.toString());
    if (text === undefined) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    return Buffer.from(text, 'utf8');
  }

  writeFile(uri: vscode.Uri, content: Uint8Array): void {
    if (!getSession(uri.toString())) {
      throw vscode.FileSystemError.FileNotFound(uri);
    }
    setDocumentText(uri.toString(), Buffer.from(content).toString('utf8'));
    this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  delete(): void {
    throw vscode.FileSystemError.NoPermissions('delete');
  }

  rename(): void {
    throw vscode.FileSystemError.NoPermissions('rename');
  }
}
