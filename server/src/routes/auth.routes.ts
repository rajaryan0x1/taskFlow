import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import zod from "zod";
import rateLimit from "express-rate-limit";
import User from "../models/User.js";
import { env } from "../config/env.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

// ─── Validation Schemas 
const registerSchema = zod.object({
  firstName: zod.string().min(2).max(30),
  lastName: zod.string().min(2).max(30),
  username: zod.string().min(3).max(20),
  email: zod.string().email().toLowerCase().trim(),
  password: zod.string().min(6),
});

const loginSchema = zod.object({
  email: zod.string().email().toLowerCase().trim(),
  password: zod.string().min(1, "Password is required"),
});

// ─── Helpers 

function signToken(userId: string, role: "app_admin" | "user"): string {
  // Centralized signing — sub + role must match AuthTokenPayload in middleware
  return jwt.sign({ sub: userId, role }, env.JWT_SECRET, { expiresIn: "1h" });
}

// ─── Routes 

// POST /auth/register
router.post("/register", authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        message: "Invalid input",
        errors: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { firstName, lastName, username, email, password } =
      parseResult.data;

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      firstName,
      lastName,
      username,
      email,
      password: hashedPassword,
      // appRole defaults to "user" via schema
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
  } catch (err) {
    next(err);
  }
});

// POST /auth/login
router.post("/login", authLimiter, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        message: "Invalid input",
        errors: parseResult.error.flatten().fieldErrors,
      });
      return;
    }

    const { email, password } = parseResult.data;

    const user = await User.findOne({ email }).select("+password");

    // Dummy hash prevents timing attacks — bcrypt.compare always runs
    const DUMMY_HASH =
      "$2b$10$CwTycUXWue0Thq9StjUM0uJ8yZ6cC7rZ6eQ6F0s1q1yG8kGZr8YqW";
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
  } catch (err) {
    next(err);
  }
});

// POST /auth/logout
router.post("/logout", (_req: Request, res: Response): void => {
  // Stateless JWT logout — token invalidation requires a Redis blacklist.
  // Planned for a future iteration. Client should discard the token on their end.
  res.status(200).json({ message: "Logout successful" });
});

// GET /auth/me
router.get(
  "/me",
  authMiddleware,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Re-fetch from DB to get fresh data
      // select("-password") is redundant since it's select:false by default, but keeping it is fine
      const user = await User.findById(req.user!.id);

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      res.status(200).json({ user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
