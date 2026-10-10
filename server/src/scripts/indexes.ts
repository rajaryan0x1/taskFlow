import mongoose from "mongoose";
import { connectDB } from "../config/db.js";
import "../app.js";
import { log } from "../utils/logger.js";
await connectDB();
try {
  for (const model of Object.values(mongoose.models)) {
    await model.createIndexes();
    log("info", "indexes_created", { model: model.modelName });
  }
} finally { await mongoose.disconnect(); }
