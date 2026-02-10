import dotenv from "dotenv";

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} is not defined`);
  }
  return value;
}

function requiredNumber(key: string): number {
  const value = required(key);
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`${key} must be a number`);
  }
  return parsed;
}

export const env = {
  PORT: requiredNumber("PORT"),
  MONGO_URI: required("MONGO_URI"),
  JWT_SECRET: required("JWT_SECRET"),
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;