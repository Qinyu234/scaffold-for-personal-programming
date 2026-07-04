/**
 * Phase 2: trace overlay application and JSON loading.
 */

import { mergeTraceOverlay, TraceEvent } from '../analysis/trace-overlay';
import { VirtualSession } from './types';

export function parseTraceEventsJson(text: string): TraceEvent[] {
  const data = JSON.parse(text) as unknown;
  if (!Array.isArray(data)) {
    throw new Error('Trace JSON must be an array');
  }
  return data.map((item, index) => {
    const row = item as Record<string, unknown>;
    if (typeof row.file !== 'string' || typeof row.line !== 'number' || typeof row.variableName !== 'string') {
      throw new Error(`Invalid trace event at index ${index}`);
    }
    const kind = row.kind;
    if (kind !== 'use' && kind !== 'write' && kind !== 'trigger') {
      throw new Error(`Invalid kind at index ${index}`);
    }
    return {
      file: row.file,
      line: row.line,
      column: typeof row.column === 'number' ? row.column : undefined,
      kind,
      variableName: row.variableName,
      event: typeof row.event === 'string' ? row.event : undefined,
    };
  });
}

export function applyTraceEvents(session: VirtualSession, events: TraceEvent[]): VirtualSession {
  const merged = mergeTraceOverlay(session.slice, events);
  return {
    ...session,
    traceEvents: events,
    slice: merged,
  };
}
