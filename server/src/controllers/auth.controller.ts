import type { Request, Response } from "express";
import User from "../models/User.js";
import { env } from "../config/env.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import asyncHandler from "../utils/asyncHandler.js";
import { OAuth2Client } from "google-auth-library";
import { ApiError } from "../utils/ApiError.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || "dummy_client_id");


// ─── Helpers 
function signToken(userId: string, role: "app_admin" | "user"): string {
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: "1h" });
}

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

  const token = signToken(newUser._id.toString(), newUser.appRole);

  res.status(201).json({
    message: "Account created successfully",
    token,
    user: {
      id: newUser._id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      username: newUser.username,
      email: newUser.email,
      appRole: newUser.appRole,
    },
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

  const token = signToken(user._id.toString(), user.appRole);

  res.status(200).json({
    message: "Login successful",
    token,
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      username: user.username,
      email: user.email,
      appRole: user.appRole,
    },
  });
});

export const logout = (req: Request, res: Response) => {
  res.status(200).json({ message: "Logout successful" });
};

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id);

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.status(200).json({ user });
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

  const token = signToken(user._id.toString(), user.appRole);

  res.status(200).json({
    success: true,
    data: {
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        appRole: user.appRole,
        authProvider: user.authProvider,
      },
    },
  });
});
