/**
 * Public analyze API — shared by CLI and VS Code extension.
 */

import { buildContracts, Contract } from '../analysis/contract';

export type { Contract } from '../analysis/contract';

export function analyzeFile(filePath: string, variableFilter?: string): Contract[] {
  const contracts = buildContracts(filePath);
  if (!variableFilter) {
    return contracts;
  }
  return contracts.filter(c => c.variableName === variableFilter);
}
