import mongoose from "mongoose";
import { env } from "./env.js";

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", false);
    await mongoose.connect(env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
    process.exit(1);
  }
};