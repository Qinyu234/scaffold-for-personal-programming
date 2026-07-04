/**
 * Lucid data type model: (length, interpretation) per DESIGN.md.
 */

import * as fs from 'fs';
import { Contract } from './contract-types';

export type LengthClass = 'fixed' | 'unsized';
export type Interpretation = 'bool' | 'char' | 'int32' | 'int64' | 'double' | 'string';

export interface LucidDataType {
  length: LengthClass;
  interpretation: Interpretation;
  label: string;
}

const FIXED: Record<Interpretation, LucidDataType> = {
  bool: { length: 'fixed', interpretation: 'bool', label: 'bool' },
  char: { length: 'fixed', interpretation: 'char', label: 'char' },
  int32: { length: 'fixed', interpretation: 'int32', label: 'int32' },
  int64: { length: 'fixed', interpretation: 'int64', label: 'int64' },
  double: { length: 'fixed', interpretation: 'double', label: 'double' },
  string: { length: 'unsized', interpretation: 'string', label: 'string' },
};

export function lucidType(length: LengthClass, interpretation: Interpretation): LucidDataType {
  return { ...FIXED[interpretation], length };
}

function rhsFromDefineLine(line: string, name: string): string | null {
  const hint = new RegExp(`\\b${name}\\s*:\\s*([A-Za-z_][\\w.]*)\\s*=`).exec(line);
  if (hint) {
    return hint[1];
  }
  const assign = new RegExp(`\\b${name}\\s*=\\s*(.+?)(?:\\s#|$)`).exec(line.trim());
  return assign?.[1]?.trim() ?? null;
}

function typeFromHint(hint: string): LucidDataType {
  const h = hint.toLowerCase();
  if (h === 'bool') {
    return lucidType('fixed', 'bool');
  }
  if (h === 'str' || h === 'string') {
    return lucidType('unsized', 'string');
  }
  if (h === 'float') {
    return lucidType('fixed', 'double');
  }
  if (h === 'int') {
    return lucidType('fixed', 'int64');
  }
  return lucidType('fixed', 'int64');
}

function typeFromRhs(rhs: string): LucidDataType {
  const v = rhs.trim();
  if (/^["']/.test(v)) {
    return lucidType('unsized', 'string');
  }
  if (/^(True|False)\b/.test(v)) {
    return lucidType('fixed', 'bool');
  }
  if (/^\d+\.\d+/.test(v) || /\.\d+$/.test(v)) {
    return lucidType('fixed', 'double');
  }
  if (/^\d+$/.test(v)) {
    const n = Number(v);
    if (Number.isSafeInteger(n) && n >= -(2 ** 31) && n <= 2 ** 31 - 1) {
      return lucidType('fixed', 'int32');
    }
    return lucidType('fixed', 'int64');
  }
  return lucidType('fixed', 'int64');
}

export function inferPythonDataType(filePath: string, contract: Contract): LucidDataType {
  const source = fs.readFileSync(filePath, 'utf-8');
  const lines = source.split(/\r?\n/);
  const line = lines[contract.definedAt.line - 1] ?? '';
  const rhs = rhsFromDefineLine(line, contract.variableName);
  if (!rhs) {
    return lucidType('fixed', 'int64');
  }
  if (/^(int|float|str|string|bool)$/i.test(rhs)) {
    return typeFromHint(rhs);
  }
  return typeFromRhs(rhs);
}
