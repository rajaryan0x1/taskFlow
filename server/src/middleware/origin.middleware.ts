import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

// Cookie-authenticated mutations require a trusted browser origin and a
// non-simple header, including login, to prevent login CSRF as well.
export const requireTrustedOrigin: RequestHandler = (req, _res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (!req.headers.origin || !env.CORS_ORIGINS.includes(req.headers.origin) || req.get("X-TaskFlow-Client") !== "web") {
    return next(ApiError.forbidden("Untrusted request origin"));
  }
  next();
};
