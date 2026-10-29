import { randomBytes } from "node:crypto";
import User from "../models/User.js";
import { hashToken } from "./session.js";
import { accountLink, sendEmail } from "./email.js";
import { log } from "../utils/logger.js";

export async function requestAccountEmail(email: string, purpose: "verification" | "reset") {
  const field = purpose === "reset" ? "passwordReset" : "emailVerification";
  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const digest = hashToken(token);
  // Atomic account-level cooldown survives process restarts and concurrent requests.
  const user = await User.findOneAndUpdate({
    email, isDisabled: { $ne: true },
    ...(purpose === "reset" ? { password: { $type: "string" } } : { emailVerifiedAt: null }),
    $or: [{ [`${field}.issuedAt`]: { $exists: false } }, { [`${field}.issuedAt`]: { $lte: new Date(now.getTime() - 60_000) } }],
  }, { $set: { [field]: { digest, issuedAt: now, expiresAt: new Date(now.getTime() + (purpose === "reset" ? 30 * 60_000 : 24 * 60 * 60_000)) } } }, { returnDocument: "after" });
  if (!user) return;
  const reset = purpose === "reset";
  try {
    await sendEmail(user.email, reset ? "Reset your TaskFlow password" : "Verify your TaskFlow email", [
      reset ? "Use this link to choose a new password. It expires in 30 minutes." : "Confirm your email address to send and accept project invitations. This link expires in 24 hours.",
      accountLink(reset ? "/reset-password" : "/verify-email", token),
      "If you did not request this, ignore this email. Do not share this link.",
    ].join("\n\n"));
  } catch {
    // Only invalidate our own failed delivery; never invalidate a newer request.
    // Retain issuedAt to prevent repeated SMTP failures bypassing the cooldown.
    await User.updateOne({ _id: user._id, [`${field}.digest`]: digest }, { $unset: { [`${field}.digest`]: 1, [`${field}.expiresAt`]: 1 } });
    throw new Error("Account email delivery failed");
  }
}

export function queueAccountEmail(email: string, purpose: "verification" | "reset") {
  // Respond before looking up an account or contacting SMTP, avoiding enumeration
  // through response content or SMTP-dependent response timing.
  void requestAccountEmail(email, purpose).catch(() => log("error", "account_email_delivery_failed", { purpose }));
}
