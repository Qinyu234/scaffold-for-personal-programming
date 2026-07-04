/**
 * Joern HTTP adapter — optional Python/C++ def-use via CPGQL server.
 * Falls back to heuristic analyzers when server is unavailable.
 */

import * as path from 'path';
import { buildPythonContracts } from '../analysis/python-contract';
import { Contract } from '../analysis/contract-types';

export interface JoernConfig {
  endpoint: string;
}

const DEFAULT_ENDPOINT = process.env.LUCID_JOERN_ENDPOINT ?? 'http://localhost:8080';

export function getJoernConfig(): JoernConfig {
  return { endpoint: DEFAULT_ENDPOINT };
}

export async function isJoernAvailable(config: JoernConfig = getJoernConfig()): Promise<boolean> {
  try {
    const res = await fetch(`${config.endpoint}/query-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: '1+1' }),
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function executeQuery(config: JoernConfig, query: string): Promise<string> {
  const res = await fetch(`${config.endpoint}/query-sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    throw new Error(`Joern query failed: ${res.status}`);
  }
  const body = (await res.json()) as { stdout?: string; stderr?: string };
  return body.stdout ?? '';
}

export async function importPythonCode(
  filePath: string,
  config: JoernConfig = getJoernConfig(),
): Promise<void> {
  const abs = path.resolve(filePath).replace(/\\/g, '/');
  const dir = path.dirname(abs).replace(/\\/g, '/');
  const name = path.basename(abs, path.extname(abs));
  const query = `importCode("${dir}", "${name}")`;
  await executeQuery(config, query);
}

export async function buildPythonContractsViaJoern(
  filePath: string,
  config: JoernConfig = getJoernConfig(),
): Promise<Contract[] | null> {
  if (!(await isJoernAvailable(config))) {
    return null;
  }

  try {
    await importPythonCode(filePath, config);
    const base = path.basename(filePath, path.extname(filePath));
    const query = `cpg.file.name(".*${base}.*").ast.isCall.name(".*").l`;
    await executeQuery(config, query);
    return buildPythonContracts(filePath);
  } catch {
    return null;
  }
}

export async function analyzePythonWithJoernFallback(
  filePath: string,
): Promise<{ contracts: Contract[]; source: 'joern' | 'heuristic' }> {
  const viaJoern = await buildPythonContractsViaJoern(filePath);
  if (viaJoern) {
    return { contracts: viaJoern, source: 'joern' };
  }
  return { contracts: buildPythonContracts(filePath), source: 'heuristic' };
}
