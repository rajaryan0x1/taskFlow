import { randomBytes } from "node:crypto";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { env } from "../config/env.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";

const client = new OAuth2Client();
export async function verifiedGoogleIdentity(credential: string) {
  if (!env.GOOGLE_CLIENT_ID) throw new ApiError("Google sign-in is not configured", 503);
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new Error("Unverified identity");
    return payload;
  } catch { throw ApiError.unauthorized("Unable to verify Google sign-in"); }
}
export async function resolveGoogleUser(payload: TokenPayload) {
  if (!payload.sub || !payload.email || !payload.email_verified) throw ApiError.unauthorized("A verified Google email is required");
  const existing = await User.findOne({ googleId: payload.sub });
  if (existing) return existing;
  const email = payload.email.trim().toLowerCase();
  if (await User.findOne({ email })) {
    throw ApiError.conflict("An account already uses this email. Sign in with your existing method and link Google in account settings.");
  }
  const firstName = payload.given_name?.trim().slice(0, 30) || "New";
  const lastName = payload.family_name?.trim().slice(0, 30) || "User";
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await User.create({
        firstName, lastName, email,
        username: `user_${randomBytes(7).toString("hex")}`,
        googleId: payload.sub, authProvider: "google",
        needsProfileCompletion: !payload.given_name?.trim() || !payload.family_name?.trim(),
      });
    } catch (error) {
      if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
      const concurrent = await User.findOne({ googleId: payload.sub });
      if (concurrent) return concurrent;
      if (await User.findOne({ email })) throw ApiError.conflict("An account already uses this email. Sign in with your existing method.");
    }
  }
  throw ApiError.conflict("Unable to reserve a username. Please try again.");
}
