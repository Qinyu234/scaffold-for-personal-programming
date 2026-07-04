/**
 * lucid:// URI helpers.
 */

export interface VirtualUriParts {
  viewType: string;
  scopeId: string;
  sourceFile: string;
}

export function buildVirtualUri(viewType: string, scopeId: string, sourceFile: string): string {
  const q = encodeURIComponent(sourceFile);
  return `lucid://view/${viewType}/${scopeId}?file=${q}`;
}

export function buildTranslationUri(
  targetLang: string,
  scopeId: string,
  sourceFile: string,
): string {
  const q = encodeURIComponent(sourceFile);
  return `lucid://translation/${targetLang}/${scopeId}?file=${q}`;
}

export function parseTranslationUri(uri: string): VirtualUriParts | null {
  try {
    const u = new URL(uri);
    if (u.protocol !== 'lucid:') {
      return null;
    }
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'translation' || parts.length < 3) {
      return null;
    }
    const file = u.searchParams.get('file');
    if (!file) {
      return null;
    }
    return {
      viewType: `translation:${parts[1]}`,
      scopeId: parts[2],
      sourceFile: decodeURIComponent(file),
    };
  } catch {
    return null;
  }
}

export function parseVirtualUri(uri: string): VirtualUriParts | null {
  try {
    const u = new URL(uri);
    if (u.protocol !== 'lucid:') {
      return null;
    }
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'view' || parts.length < 3) {
      return null;
    }
    const file = u.searchParams.get('file');
    if (!file) {
      return null;
    }
    return {
      viewType: parts[1],
      scopeId: parts[2],
      sourceFile: decodeURIComponent(file),
    };
  } catch {
    return null;
  }
}
