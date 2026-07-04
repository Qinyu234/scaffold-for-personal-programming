/**
 * Stable source location for Projection Slice Cut / patch mapping.
 */

export type SpanProvenance = 'inferred' | 'observed';

export interface SourceSpan {
  file: string;
  line: number;
  column: number;
  enclosingFunction: string;
  kind: 'define' | 'write' | 'use' | 'trigger';
  variableName?: string;
  event?: string;
  provenance?: SpanProvenance;
}

export function isValidSpan(span: SourceSpan): boolean {
  return (
    span.file.length > 0 &&
    span.line >= 1 &&
    span.column >= 0 &&
    span.enclosingFunction.length > 0
  );
}
