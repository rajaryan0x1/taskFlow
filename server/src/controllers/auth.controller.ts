import type { Request, Response } from "express";
import User from "../models/User.js";
import { publicUser } from "../utils/publicUser.js";
import { startSession, endSession, clearSessionCookie } from "../services/session.js";
import { Session } from "../models/Session.js";
import { log, safeError } from "../utils/logger.js";
import bcrypt from "bcrypt";
import asyncHandler from "../utils/asyncHandler.js";
import { verifiedGoogleIdentity, resolveGoogleUser } from "../services/google.js";
import { ApiError } from "../utils/ApiError.js";




// ─── Controllers

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, username, email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({
    firstName,
    lastName,
    username,
    email,
    password: hashedPassword,
  });

  await startSession(req, res, newUser._id.toString(), newUser.authVersion ?? 0);

  res.status(201).json({
    message: "Account created successfully",
    user: publicUser(newUser),
  });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  const DUMMY_HASH = "$2b$10$CwTycUXWue0Thq9StjUM0uJ8yZ6cC7rZ6eQ6F0s1q1yG8kGZr8YqW";
  const hashToCompare = user?.password ?? DUMMY_HASH;

  const isPasswordValid = await bcrypt.compare(password, hashToCompare);

  if (!user || !isPasswordValid) {
    res.status(401).json({ message: "Invalid email or password" });
    return;
  }

  if (user.isDisabled) throw ApiError.unauthorized("This account is unavailable");
  await startSession(req, res, user._id.toString(), user.authVersion ?? 0);

  res.status(200).json({
    message: "Login successful",
    user: publicUser(user),
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await endSession(req, res);
  res.status(200).json({ success: true, message: "Logout successful" });
});

export const logoutAll = asyncHandler(async (req: Request, res: Response) => {
  await endSession(req, res, true);
  res.status(200).json({ success: true, message: "All sessions signed out" });
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ success: true, user: publicUser(user) });
});


export const googleAuth = asyncHandler(async (req: Request, res: Response) => {
  const { credential } = req.body;

  if (!credential) {
    throw ApiError.badRequest("Google credential is required");
  }

  const payload = await verifiedGoogleIdentity(credential);
  const user = await resolveGoogleUser(payload);

  if (user.isDisabled) throw ApiError.unauthorized("This account is unavailable");
  await startSession(req, res, user._id.toString(), user.authVersion ?? 0);

  res.status(200).json({
    success: true,
    data: {
        user: publicUser(user),
    },
  });
});

export const linkGoogle = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select("+password");
  if (!user?.password || typeof req.body.password !== "string" || !await bcrypt.compare(req.body.password, user.password)) {
    throw ApiError.unauthorized("Confirm your current password to link Google");
  }
  const payload = await verifiedGoogleIdentity(req.body.credential);
  if (payload.email!.toLowerCase() !== user.email || (user.googleId && user.googleId !== payload.sub)) {
    throw ApiError.conflict("The Google identity does not match this account");
  }
  const linked = await User.findOne({ googleId: payload.sub });
  if (linked && linked._id.toString() !== user._id.toString()) throw ApiError.conflict("Google identity is already linked");
  user.googleId = payload.sub;
  await user.save();
  res.json({ success: true, user: publicUser(user) });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);
  if (!user) throw ApiError.unauthorized("Please sign in");
  user.firstName = req.body.firstName;
  user.lastName = req.body.lastName;
  user.needsProfileCompletion = false;
  await user.save();
  res.json({ success: true, user: publicUser(user) });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id).select("+password");
  if (!user || user.isDisabled || (user.authVersion ?? 0) !== req.user!.authVersion) {
    throw ApiError.unauthorized("Please sign in again");
  }
  if (!user.password) throw ApiError.badRequest("Manage your password with your sign-in provider");
  if (!await bcrypt.compare(req.body.currentPassword, user.password)) {
    // A wrong confirmation is not an expired session; keep the form available.
    throw ApiError.forbidden("Current password is incorrect");
  }
  if (await bcrypt.compare(req.body.newPassword, user.password)) {
    throw ApiError.badRequest("Choose a different password");
  }
  const password = await bcrypt.hash(req.body.newPassword, 10);
  const updated = await User.findOneAndUpdate({
    _id: user._id,
    password: user.password,
    isDisabled: { $ne: true },
    $or: [{ authVersion: req.user!.authVersion }, ...(req.user!.authVersion === 0 ? [{ authVersion: { $exists: false } }] : [])],
  }, { $set: { password }, $inc: { authVersion: 1 } }, { returnDocument: "after" });
  if (!updated) throw ApiError.conflict("Your account changed. Sign in again before retrying.");

  // The atomic version increment is the revocation boundary. Even a late
  // session insert or cleanup failure cannot make an old credential valid.
  req.app.locals.io?.in(`user:${user._id}`).disconnectSockets(true);
  clearSessionCookie(res);
  try {
    await Session.deleteMany({ user: user._id, $or: [
      { authVersion: { $lt: updated.authVersion } }, { authVersion: { $exists: false } },
    ] });
  } catch (error) {
    log("error", "revoked_session_cleanup_failed", { requestId: req.requestId, ...safeError(error) });
  }
  res.json({ success: true, message: "Password changed. Sign in again with your new password." });
});
