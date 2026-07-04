"use strict";
/**
 * Shared contract types and validation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContractSchema = exports.TriggeredBySchema = exports.UseSiteSchema = exports.WriteSiteSchema = void 0;
exports.validateContract = validateContract;
const zod_1 = require("zod");
exports.WriteSiteSchema = zod_1.z.object({
    variableName: zod_1.z.string(),
    file: zod_1.z.string(),
    line: zod_1.z.number(),
    column: zod_1.z.number(),
    enclosingFunction: zod_1.z.string(),
    assignmentType: zod_1.z.string(),
});
exports.UseSiteSchema = zod_1.z.object({
    variableName: zod_1.z.string(),
    file: zod_1.z.string(),
    line: zod_1.z.number(),
    column: zod_1.z.number(),
    enclosingFunction: zod_1.z.string(),
});
exports.TriggeredBySchema = zod_1.z.object({
    event: zod_1.z.string(),
    line: zod_1.z.number(),
});
exports.ContractSchema = zod_1.z.object({
    variableName: zod_1.z.string(),
    definedAt: zod_1.z.object({
        file: zod_1.z.string(),
        line: zod_1.z.number(),
        column: zod_1.z.number(),
    }),
    writeSites: zod_1.z.array(exports.WriteSiteSchema),
    useSites: zod_1.z.array(exports.UseSiteSchema),
    triggeredBy: zod_1.z.array(exports.TriggeredBySchema),
    source: zod_1.z.union([zod_1.z.literal('inferred'), zod_1.z.literal('explicit')]),
});
function validateContract(contract) {
    const result = exports.ContractSchema.safeParse(contract);
    return result.success ? result.data : null;
}
//# sourceMappingURL=contract-types.js.map