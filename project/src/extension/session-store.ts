/**
 * In-memory session store keyed by lucid:// URI.
 */

import { VirtualSession } from '../virtual/types';
import { buildVirtualUri } from '../virtual/uri';

const sessions = new Map<string, VirtualSession>();
const dirtyText = new Map<string, string>();

export function sessionKey(session: VirtualSession): string {
  return buildVirtualUri(session.viewType, session.scopeId, session.sourceFilePath);
}

export function putSession(session: VirtualSession): string {
  const key = sessionKey(session);
  sessions.set(key, session);
  dirtyText.set(key, session.document.text);
  return key;
}

export function getSession(uri: string): VirtualSession | undefined {
  return sessions.get(uri);
}

export function getDocumentText(uri: string): string | undefined {
  return dirtyText.get(uri);
}

export function setDocumentText(uri: string, text: string): void {
  dirtyText.set(uri, text);
}

export function updateSession(uri: string, session: VirtualSession): void {
  sessions.set(uri, session);
}

export function allSessions(): Iterable<[string, VirtualSession]> {
  return sessions.entries();
}
