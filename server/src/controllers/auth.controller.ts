import type { Request, Response } from "express";
import User from "../models/User.js";
import { publicUser } from "../utils/publicUser.js";
import { env } from "../config/env.js";
import { startSession, endSession } from "../services/session.js";
import bcrypt from "bcrypt";
import asyncHandler from "../utils/asyncHandler.js";
import { OAuth2Client } from "google-auth-library";
import { ApiError } from "../utils/ApiError.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "dummy_client_id");


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

  await startSession(req, res, newUser._id.toString());

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
  await startSession(req, res, user._id.toString());

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

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID || "dummy_client_id",
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw ApiError.unauthorized("Invalid Google token");
  }

  const emailStr = payload.email as string;
  let user = await User.findOne({ email: emailStr });

  if (!user) {
    // Generate a default username
    const username = (emailStr.split("@")[0] || "user") + Math.floor(Math.random() * 1000);
    user = await User.create({
      firstName: payload.given_name || "User",
      lastName: payload.family_name || "",
      email: emailStr,
      username,
      googleId: payload.sub,
      authProvider: "google",
    });
  } else if (!user.googleId) {
    // Link google account to existing user
    user.googleId = payload.sub;
    user.authProvider = "google";
    await user.save();
  }

  if (user.isDisabled) throw ApiError.unauthorized("This account is unavailable");
  await startSession(req, res, user._id.toString());

  res.status(200).json({
    success: true,
    data: {
        user: publicUser(user),
    },
  });
});
