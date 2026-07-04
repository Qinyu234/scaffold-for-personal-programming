/**
 * Translation Virtual File — one-way copy layout (Phase 2 scaffold).
 */

import * as fs from 'fs';
import * as path from 'path';
import { VirtualDocument, VirtualSession, Lineage } from './types';
import { ProjectionSlice } from '../projection/def-use-slice';
import { buildTranslationUri } from './uri';

export type TranslationTarget = 'cpp' | 'safe-cpp-rust';

/** Phase 2+: Python subset → C++ via py2cpp / PyCer (when wired). */
export type TranslationSource = 'python' | 'rust';

export interface TranslationRequest {
  sourceFile: string;
  scopeId: string;
  targetLang: TranslationTarget;
  /** Defaults from file extension when omitted. */
  sourceLang?: TranslationSource;
}

function readFileText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function placeholderSafeCppFromRust(source: string, scopeId: string): string {
  const lines = [
    `// Lucid translation (scaffold): Rust-flavored *safe* C++`,
    `// scope: ${scopeId}`,
    `// DESIGN: not modern Rust→C++ — restricted "safe C++" dialect (RAII, no raw owning pointers).`,
    `// Target: early-Rust-style subset OR project-specific #pragma lucid_safe rules.`,
    '',
    '#pragma once',
    '// TODO: map ownership/borrow checks to explicit safe wrappers',
    `// --- source excerpt ---`,
    ...source.split(/\r?\n/).slice(0, 40).map(l => `// ${l}`),
  ];
  return lines.join('\n');
}

function placeholderCppFromPython(source: string, scopeId: string): string {
  const lines = [
    `// Lucid translation (scaffold): Python → C++`,
    `// scope: ${scopeId}`,
    `// NOTE: subset mapping only — full py2cpp integration pending`,
    '',
    '// TODO: wire py2cpp / PyCer subprocess',
    `// --- source excerpt ---`,
    ...source.split(/\r?\n/).slice(0, 40).map(l => `// ${l}`),
  ];
  return lines.join('\n');
}

export function buildTranslationDocument(req: TranslationRequest): VirtualDocument {
  const source = readFileText(req.sourceFile);
  const sourceLang = req.sourceLang ?? (req.sourceFile.endsWith('.rs') ? 'rust' : 'python');
  let text: string;
  if (req.targetLang === 'safe-cpp-rust' || sourceLang === 'rust') {
    text = placeholderSafeCppFromRust(source, req.scopeId);
  } else if (req.targetLang === 'cpp') {
    text = placeholderCppFromPython(source, req.scopeId);
  } else {
    text = `// unsupported target: ${req.targetLang}`;
  }

  return {
    text,
    segments: [
      {
        id: `translation:${req.scopeId}`,
        kind: 'translation',
        sourceFile: req.sourceFile,
        sourceLine: 1,
        virtualStartLine: 1,
        virtualEndLine: text.split(/\r?\n/).length,
        collapsed: false,
        enclosingFunction: '<module>',
      },
    ],
  };
}

export function createTranslationSession(
  req: TranslationRequest,
  _workspaceRoot: string,
): VirtualSession {
  const slice: ProjectionSlice = {
    viewType: 'translation',
    scopeId: req.scopeId,
    spans: [],
  };
  const document = buildTranslationDocument(req);
  const virtualUri = buildTranslationUri(req.targetLang, req.scopeId, req.sourceFile);

  const lineage: Lineage = {
    virtualUri,
    sourceFile: path.resolve(req.sourceFile),
    viewType: 'translation',
    scopeId: req.scopeId,
  };

  return {
    viewType: 'translation',
    scopeId: req.scopeId,
    sourceFilePath: path.resolve(req.sourceFile),
    slice,
    document,
    pulledSnapshot: document.text,
    collapsedFunctions: new Set(),
    selectedSegmentIds: new Set(['translation:' + req.scopeId]),
    lineage,
  };
}
