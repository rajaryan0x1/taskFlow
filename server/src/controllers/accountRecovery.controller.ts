import bcrypt from "bcrypt";
import User from "../models/User.js";
import { Session } from "../models/Session.js";
import { clearSessionCookie, hashToken } from "../services/session.js";
import { queueAccountEmail } from "../services/accountEmail.js";
import { sendEmail } from "../services/email.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { log } from "../utils/logger.js";

export const forgotPassword = asyncHandler(async (req, res) => {
  res.status(202).json({ message: "If a password account exists for this email, you will receive a reset link shortly." });
  queueAccountEmail(req.body.email, "reset");
});

export const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.unauthorized("Please sign in again");
  res.status(202).json({ message: "If your email needs verification, a link will arrive shortly. Allow a minute before requesting another." });
  queueAccountEmail(user.email, "verification");
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findOneAndUpdate({
    "emailVerification.digest": hashToken(req.body.token),
    "emailVerification.expiresAt": { $gt: new Date() },
    isDisabled: { $ne: true }, emailVerifiedAt: null,
  }, { $set: { emailVerifiedAt: new Date() }, $unset: { emailVerification: 1 } });
  if (!user) throw ApiError.badRequest("This verification link is invalid or expired. Request a new link in Account settings.");
  res.json({ message: "Email verified. You can now send and accept project invitations." });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const digest = hashToken(req.body.token);
  const query = { "passwordReset.digest": digest, "passwordReset.expiresAt": { $gt: new Date() }, isDisabled: { $ne: true }, password: { $type: "string" as const } };
  if (!await User.exists(query)) throw ApiError.badRequest("This reset link is invalid or expired. Request a new one.");
  const password = await bcrypt.hash(req.body.password, 10);
  // Token consumption, password replacement, and session invalidation are one
  // atomic write. A concurrent reset or replay cannot reuse the same token.
  const user = await User.findOneAndUpdate({ ...query, "passwordReset.expiresAt": { $gt: new Date() } }, {
    $set: { password, emailVerifiedAt: new Date() }, $inc: { authVersion: 1 }, $unset: { passwordReset: 1, emailVerification: 1 },
  }, { returnDocument: "after" });
  if (!user) throw ApiError.badRequest("This reset link is invalid or expired. Request a new one.");
  req.app.locals.io?.in(`user:${user._id}`).disconnectSockets(true);
  clearSessionCookie(res);
  try { await Session.deleteMany({ user: user._id, $or: [{ authVersion: { $lt: user.authVersion } }, { authVersion: { $exists: false } }] }); }
  catch { log("error", "revoked_session_cleanup_failed", { requestId: req.requestId }); }
  res.json({ message: "Password reset. Sign in with your new password." });
  void sendEmail(user.email, "Your TaskFlow password was reset", "Your password was reset and previous sessions were signed out. If you did not do this, reset your password immediately using Forgot password on the sign-in page.")
    .catch(() => log("error", "password_notice_delivery_failed"));
});
