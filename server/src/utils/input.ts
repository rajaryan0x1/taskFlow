import { z } from "zod";
import { ApiError } from "./ApiError.js";
export const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier");
export const booleanQuery = z.enum(["true", "false"]).optional();
export const dateInput = z.union([z.literal(""), z.iso.date(), z.iso.datetime({ offset: true })]).nullable().optional();
export const cursorSchema = z.object({
  cursor: objectId.optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(100)).optional().default(50),
});
export function parseInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw ApiError.badRequest("Validation failed", parsed.error.flatten().fieldErrors as Record<string, string[]>);
  return parsed.data;
}
export function cursorFilter(cursor: string | undefined) { return cursor ? { _id: { $lt: cursor } } : {}; }
export function pageResult<T extends { _id: { toString(): string } }>(rows: T[], limit: number) {
  const data = rows.slice(0, limit);
  return { data, pagination: { nextCursor: rows.length > limit ? data.at(-1)!._id.toString() : null } };
}
export function escapeRegex(value: string) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
