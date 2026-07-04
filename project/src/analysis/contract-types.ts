/**
 * Shared contract types and validation.
 */

import { z } from 'zod';

export const WriteSiteSchema = z.object({
  variableName: z.string(),
  file: z.string(),
  line: z.number(),
  column: z.number(),
  enclosingFunction: z.string(),
  assignmentType: z.string(),
});

export const UseSiteSchema = z.object({
  variableName: z.string(),
  file: z.string(),
  line: z.number(),
  column: z.number(),
  enclosingFunction: z.string(),
});

export const TriggeredBySchema = z.object({
  event: z.string(),
  line: z.number(),
});

export const ContractSchema = z.object({
  variableName: z.string(),
  definedAt: z.object({
    file: z.string(),
    line: z.number(),
    column: z.number(),
  }),
  writeSites: z.array(WriteSiteSchema),
  useSites: z.array(UseSiteSchema),
  triggeredBy: z.array(TriggeredBySchema),
  source: z.union([z.literal('inferred'), z.literal('explicit')]),
});

export type WriteSite = z.infer<typeof WriteSiteSchema>;
export type UseSite = z.infer<typeof UseSiteSchema>;
export type TriggeredBy = z.infer<typeof TriggeredBySchema>;
export type Contract = z.infer<typeof ContractSchema>;

export function validateContract(contract: Contract): Contract | null {
  const result = ContractSchema.safeParse(contract);
  return result.success ? result.data : null;
}
