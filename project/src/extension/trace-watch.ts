/**
 * Auto-watch `.lucid/trace.json` and merge trace overlay into open sessions.
 */

import * as chokidar from 'chokidar';
import * as fs from 'fs';
import * as path from 'path';
import { allSessions, putSession } from './session-store';
import { traceJsonPath } from './lucid-paths';
import { parseTraceEventsJson } from '../virtual/trace-session';
import { applyTraceToSession, sessionAcceptsTraceOverlay } from '../virtual/trace-apply';

let traceWatcher: chokidar.FSWatcher | undefined;
let lastWorkspaceRoot: string | undefined;

export type TraceWatchHandler = (result: { eventCount: number; sessionCount: number }) => void;

function mergeTraceFile(workspaceRoot: string, onApplied?: TraceWatchHandler): void {
  const filePath = traceJsonPath(workspaceRoot);
  if (!fs.existsSync(filePath)) {
    return;
  }
  let events;
  try {
    events = parseTraceEventsJson(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return;
  }
  let sessionCount = 0;
  for (const [, session] of allSessions()) {
    if (!sessionAcceptsTraceOverlay(session)) {
      continue;
    }
    putSession(applyTraceToSession(session, events, workspaceRoot));
    sessionCount++;
  }
  onApplied?.({ eventCount: events.length, sessionCount });
}

export function syncTraceJsonWatch(workspaceRoot: string, onApplied?: TraceWatchHandler): void {
  lastWorkspaceRoot = workspaceRoot;
  const lucidDir = path.join(workspaceRoot, '.lucid');
  if (traceWatcher) {
    void traceWatcher.close();
    traceWatcher = undefined;
  }

  if (!fs.existsSync(lucidDir)) {
    fs.mkdirSync(lucidDir, { recursive: true });
  }

  traceWatcher = chokidar.watch(lucidDir, {
    ignoreInitial: false,
    depth: 0,
    awaitWriteFinish: { stabilityThreshold: 200 },
  });

  const onTraceFile = (changed: string) => {
    if (path.basename(changed) === 'trace.json') {
      mergeTraceFile(workspaceRoot, onApplied);
    }
  };

  traceWatcher.on('add', onTraceFile);
  traceWatcher.on('change', onTraceFile);

  mergeTraceFile(workspaceRoot, onApplied);
}

export function reloadTraceFromDefaultPath(onApplied?: TraceWatchHandler): boolean {
  if (!lastWorkspaceRoot) {
    return false;
  }
  const filePath = traceJsonPath(lastWorkspaceRoot);
  if (!fs.existsSync(filePath)) {
    return false;
  }
  mergeTraceFile(lastWorkspaceRoot, onApplied);
  return true;
}

export function disposeTraceJsonWatch(): void {
  if (traceWatcher) {
    void traceWatcher.close();
    traceWatcher = undefined;
  }
  lastWorkspaceRoot = undefined;
}
