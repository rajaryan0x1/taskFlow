import { z } from "zod";

export const newPasswordSchema = z.string().min(12).max(72).refine(
  value => Buffer.byteLength(value, "utf8") <= 72,
  "Password must be at most 72 UTF-8 bytes",
);
