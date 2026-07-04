/**
 * Apply trace events to a Virtual File session (shared by command + auto watch).
 */

import { TraceEvent } from '../analysis/trace-overlay';
import { VirtualSession } from './types';
import { applyTraceEvents } from './trace-session';
import { relayoutSession } from './session';

const TRACE_VIEWS = new Set<VirtualSession['viewType']>([
  'def-use',
  'data-flow',
  'event-flow',
  'impact',
]);

export function sessionAcceptsTraceOverlay(session: VirtualSession): boolean {
  return TRACE_VIEWS.has(session.viewType);
}

export function applyTraceToSession(
  session: VirtualSession,
  events: TraceEvent[],
  workspaceRoot: string,
): VirtualSession {
  if (!sessionAcceptsTraceOverlay(session)) {
    return session;
  }
  let updated = applyTraceEvents(session, events);
  updated = relayoutSession(updated, workspaceRoot);
  return updated;
}
