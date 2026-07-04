/**
 * Data Flow View (Python): filter IR to one data name + (length, interpretation).
 */

import { analyzeFile } from '../core/analyze';
import { inferPythonDataType, LucidDataType } from '../analysis/data-type';
import { Contract } from '../analysis/contract';
import { SourceSpan } from '../analysis/span';
import { contractToSpans, ProjectionSlice } from './def-use-slice';
import { detectLanguage } from '../ingestion/language';

export interface DataFlowSlice extends ProjectionSlice {
  viewType: 'data-flow';
  dataType: LucidDataType;
}

export function buildDataFlowSlice(filePath: string, dataName: string): DataFlowSlice | null {
  if (detectLanguage(filePath) !== 'python') {
    return null;
  }

  const contracts = analyzeFile(filePath, dataName);
  if (contracts.length === 0) {
    return null;
  }

  const contract = contracts[0];
  const dataType = inferPythonDataType(filePath, contract);
  const spans = contractToSpans(contract, filePath);

  return {
    viewType: 'data-flow',
    scopeId: dataName,
    dataType,
    spans,
  };
}

export function listPythonDataNames(filePath: string): string[] {
  if (detectLanguage(filePath) !== 'python') {
    return [];
  }
  return analyzeFile(filePath).map(c => c.variableName);
}

export function dataTypeNodeId(dataType: LucidDataType): string {
  return `type:${dataType.label}:${dataType.length}`;
}

export function dataNodeId(scopeId: string): string {
  return `data:${scopeId}`;
}

export function spanNodeId(span: SourceSpan): string {
  return `${span.kind}:${span.line}:${span.column}`;
}
