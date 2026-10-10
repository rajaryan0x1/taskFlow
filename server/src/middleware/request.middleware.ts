import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import { log } from "../utils/logger.js";
declare global { namespace Express { interface Request { requestId?: string } } }
export const requestContext: RequestHandler = (req, res, next) => {
  req.requestId = randomUUID();
  res.setHeader("X-Request-ID", req.requestId);
  const started = performance.now();
  res.on("finish", () => log(res.statusCode >= 500 ? "error" : "info", "http_request", {
    requestId: req.requestId, method: req.method,
    route: req.route?.path ?? "unmatched", status: res.statusCode,
    durationMs: Math.round(performance.now() - started),
  }));
  next();
};
