/**
 * push overlay — save_selected / save_all back to real source (single-file lines).
 */

import { replaceSourceLine, replaceSourceRange } from './extract';
import { parseSegmentContent } from './layout';
import { DocumentSegment, PushResult, VirtualSession } from './types';

function segmentsToPush(session: VirtualSession, mode: 'selected' | 'all'): DocumentSegment[] {
  const { segments } = session.document;
  if (mode === 'all') {
    return segments.filter(s => !s.collapsed);
  }
  if (session.selectedSegmentIds.size === 0) {
    return [];
  }
  return segments.filter(s => !s.collapsed && session.selectedSegmentIds.has(s.id));
}

export function pushOverlay(
  session: VirtualSession,
  virtualText: string,
  mode: 'selected' | 'all',
): PushResult {
  const toPush = segmentsToPush(session, mode);
  let updatedLines = 0;
  const files = new Set<string>();

  for (const segment of toPush) {
    const content = parseSegmentContent(virtualText, segment);
    if (!content || content.startsWith('// [collapsed]') || content.startsWith('# [collapsed]')) {
      continue;
    }
    const sourceEnd = segment.sourceEndLine ?? segment.sourceLine;
    const newLines = content.split(/\r?\n/);
    if (sourceEnd > segment.sourceLine) {
      replaceSourceRange(segment.sourceFile, segment.sourceLine, sourceEnd, newLines);
    } else {
      replaceSourceLine(segment.sourceFile, segment.sourceLine, newLines[0] ?? content);
    }
    files.add(segment.sourceFile);
    updatedLines += newLines.length;
  }

  return {
    updatedFiles: [...files],
    updatedLines,
  };
}

export function selectSegmentForFunction(session: VirtualSession, functionName: string): VirtualSession {
  const ids = new Set<string>();
  for (const s of session.document.segments) {
    if (s.enclosingFunction === functionName || s.id.includes(functionName)) {
      ids.add(s.id);
    }
  }
  return { ...session, selectedSegmentIds: ids };
}

export function selectAllSegments(session: VirtualSession): VirtualSession {
  return {
    ...session,
    selectedSegmentIds: new Set(session.document.segments.map(s => s.id)),
  };
}
