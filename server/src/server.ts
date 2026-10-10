import http from "node:http";
import mongoose from "mongoose";
import app from "./app.js";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { initializeSocket } from "./sockets/task.socket.js";
import { log, safeError } from "./utils/logger.js";

const server = http.createServer(app);
const io = initializeSocket(server);
app.locals.io = io;
await connectDB();
server.listen(env.PORT, () => log("info", "server_listening", { port: env.PORT, environment: env.NODE_ENV }));
let closing = false;
const shutdown = async () => {
  if (closing) return;
  closing = true;
  log("info", "shutdown_started");
  const timeout = setTimeout(() => { log("error", "shutdown_timeout"); process.exit(1); }, 10000);
  timeout.unref();
  try {
    io.disconnectSockets(true);
    await new Promise<void>(resolve => io.close(() => resolve()));
    await mongoose.disconnect();
    clearTimeout(timeout);
    log("info", "shutdown_complete");
    process.exit(0);
  } catch (error) { log("error", "shutdown_failed", safeError(error)); process.exit(1); }
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
