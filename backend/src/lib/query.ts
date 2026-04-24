import { z } from "zod";

export const filterSchema = z.object({
  field: z.string(),
  op: z.enum(["eq", "gte", "lte", "in"]),
  value: z.any(),
});

export const queryPayloadSchema = z.object({
  filters: z.array(filterSchema).default([]),
  or: z.array(filterSchema).default([]),
  order: z.array(
    z.object({
      field: z.string(),
      ascending: z.boolean().default(true),
    }),
  ).default([]),
  limit: z.number().int().positive().optional(),
  single: z.boolean().optional(),
  maybeSingle: z.boolean().optional(),
  select: z.string().optional(),
});

export type QueryPayload = z.infer<typeof queryPayloadSchema>;

export function parseOrFilter(input: string) {
  return input
    .split(",")
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [field, op, ...rest] = chunk.split(".");
      const raw = rest.join(".");
      const value = raw === "true" ? true : raw === "false" ? false : raw;
      const normalizedOp =
        op === "gte" || op === "lte" || op === "eq" || op === "in" ? op : "eq";
      return { field, op: normalizedOp, value };
    });
}
