import dotenv from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV !== "test") dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === "production";

/**
 * A required string setting. Outside production a development fallback is
 * used when the variable is missing; in production the variable must be set
 * explicitly so a deployment cannot silently connect to a development database.
 */
const secret = (name: string, devFallback: string, minProdLength = 1) => {
  const base = z
    .string({ error: `${name} is required` })
    .min(isProduction ? minProdLength : 1, `${name} must be at least ${minProdLength} characters in production`);
  return isProduction ? base : base.default(devFallback);
};

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGO_URI: secret("MONGO_URI", "mongodb://127.0.0.1:27017/taskflow-dev").refine(value => /^mongodb(\+srv)?:\/\//.test(value), "Use a MongoDB connection URI"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(336).default(168),
  GOOGLE_CLIENT_ID: z.preprocess(value => !isProduction && typeof value === "string" && !value.endsWith(".apps.googleusercontent.com") ? "" : value, z.string().regex(/^$|^[a-zA-Z0-9_-]+\.apps\.googleusercontent\.com$/, "Use a Google OAuth web client ID or leave blank").default("")),
  CORS_ORIGINS: secret("CORS_ORIGINS", "http://localhost:5173").refine(value => value.split(",").every(item => {
    try { const origin = new URL(item.trim()); return origin.origin === item.trim() && (isProduction ? origin.protocol === "https:" : ["http:", "https:"].includes(origin.protocol)); }
    catch { return false; }
  }), "Use comma-separated exact origins; production requires HTTPS"),
  // Number of reverse proxies in front of the app (0 = none). Needed so that
  // rate limiting keys on the real client IP instead of the proxy's.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
} as const;