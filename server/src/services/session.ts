import { createHash, randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { Session } from "../models/Session.js";
import User from "../models/User.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

export const cookieName = env.NODE_ENV === "production" ? "__Host-taskflow" : "taskflow-session";
const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function sessionToken(cookie: string | undefined) {
  const value = cookie?.split(";").map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined;
}
export async function startSession(req: Request, res: Response, userId: string, authVersion: number) {
  const previous = sessionToken(req.headers.cookie);
  if (previous) {
    await Session.deleteOne({ tokenHash: hashToken(previous) });
    req.app.locals.io?.in(`session:${hashToken(previous)}`).disconnectSockets(true);
  }
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + env.SESSION_TTL_HOURS * 3600000);
  // Use the version of the account whose credentials were verified, not a fresh
  // lookup: a concurrent password change must invalidate this login as well.
  await Session.create({ tokenHash: hashToken(token), user: userId, authVersion, expiresAt });
  res.cookie(cookieName, token, { ...cookieOptions, expires: expiresAt });
}
export async function authenticateSession(cookie: string | undefined) {
  const token = sessionToken(cookie);
  if (!token) throw ApiError.unauthorized("Please sign in");
  const tokenHash = hashToken(token);
  const session = await Session.findOne({ tokenHash, expiresAt: { $gt: new Date() } });
  if (!session) throw ApiError.unauthorized("Your session has expired. Please sign in again.");
  const user = await User.findById(session.user);
  if (!user || user.isDisabled) throw ApiError.unauthorized("This account is unavailable");
  if ((session.authVersion ?? 0) !== (user.authVersion ?? 0)) {
    throw ApiError.unauthorized("Your credentials changed. Please sign in again.");
  }
  return { user, tokenHash, expiresAt: session.expiresAt };
}
export function clearSessionCookie(res: Response) {
  res.clearCookie(cookieName, cookieOptions);
}
export async function endSession(req: Request, res: Response, all = false) {
  const token = sessionToken(req.headers.cookie);
  if (all && req.user) {
    await Session.deleteMany({ user: req.user.id });
    req.app.locals.io?.in(`user:${req.user.id}`).disconnectSockets(true);
  } else if (token) {
    const tokenHash = hashToken(token);
    await Session.deleteOne({ tokenHash });
    req.app.locals.io?.in(`session:${tokenHash}`).disconnectSockets(true);
  }
  clearSessionCookie(res);
}
