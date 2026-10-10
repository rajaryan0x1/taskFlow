import { log, safeError } from "../utils/logger.js";
import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(env.MONGO_URI, { autoIndex: env.NODE_ENV !== "production", serverSelectionTimeoutMS: 10000 });
    log("info", "database_connected");
  } catch (err) {
    log("error", "database_connection_failed", safeError(err));
    process.exit(1);
  }
};