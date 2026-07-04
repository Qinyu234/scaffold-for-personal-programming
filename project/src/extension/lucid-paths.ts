/**
 * Canonical `.lucid/` artifact paths (DESIGN 20260704).
 */

import * as path from 'path';

export const TRACE_JSON_REL = path.join('.lucid', 'trace.json');

export function traceJsonPath(workspaceRoot: string): string {
  return path.join(workspaceRoot, TRACE_JSON_REL);
}
