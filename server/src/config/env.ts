import dotenv from "dotenv";

dotenv.config();

function required(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`${key} is not defined`);
  }
  return value ?? "";
}

function requiredNumber(key: string, fallback: number): number {
  const value = process.env[key] ?? String(fallback);
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a number`);
  }
  return parsed;
}

export const env = {
  PORT: requiredNumber("PORT", 5000),
  MONGO_URI: required("MONGO_URI", "mongodb://127.0.0.1:27017/taskflow-dev"),
  JWT_SECRET: required("JWT_SECRET", "dev-secret"),
  JWT_REFRESH_SECRET: required("JWT_REFRESH_SECRET", "dev-refresh-secret"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
  CORS_ORIGINS: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(",").map((origin) => origin.trim()).filter(Boolean),
} as const;