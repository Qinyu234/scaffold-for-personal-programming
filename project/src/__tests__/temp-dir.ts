/**
 * Ephemeral directories for tests — avoid writing under `out/` (Windows EPERM on rmSync).
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export function createTempDir(label: string): string {
  const safe = label.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return fs.mkdtempSync(path.join(os.tmpdir(), `lucid-${safe}-`));
}

export function removeTempDir(dir: string): void {
  if (!dir || !fs.existsSync(dir)) {
    return;
  }
  try {
    fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch (err) {
    console.warn(`[test cleanup] skipped ${dir}: ${(err as Error).message}`);
  }
}
