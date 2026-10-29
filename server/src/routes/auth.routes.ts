import { Router } from "express";
import rateLimit from "express-rate-limit";
import zod from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import { newPasswordSchema } from "../utils/password.js";
import { forgotPassword, resetPassword, resendVerification, verifyEmail } from "../controllers/accountRecovery.controller.js";
import {
  register,
  login,
  logout,
  logoutAll,
  getMe,
  googleAuth,
  linkGoogle,
  updateProfile,
  changePassword,
} from "../controllers/auth.controller.js";

const router = Router();
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

const registerSchema = zod.object({
  firstName: zod.string().trim().min(1, "Enter your first name").max(30, "Use at most 30 characters"),
  lastName: zod.string().trim().min(1, "Enter your last name").max(30, "Use at most 30 characters"),
  username: zod.string().trim().min(3, "Use at least 3 characters").max(20, "Use at most 20 characters").regex(/^[a-zA-Z0-9_]+$/, "Use letters, numbers, and underscores"),
  email: zod.string().trim().email().toLowerCase(),
  password: newPasswordSchema,
});

const loginSchema = zod.object({
  email: zod.string().trim().email().toLowerCase(),
  password: zod.string().min(1, "Password is required").max(1024),
});

// ─── Routes 
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);

const googleSchema = zod.object({
  credential: zod.string().min(1, "Credential is required").max(10000),
});

router.post("/google", authLimiter, validate(googleSchema), googleAuth);

const recoveryLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { message: "Too many requests. Please try again later." } });
const resendLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, keyGenerator: req => req.user!.id, standardHeaders: true, legacyHeaders: false, message: { message: "Too many verification requests. Please try again later." } });
const tokenSchema = zod.string().regex(/^[a-f0-9]{64}$/, "Invalid or expired link. Request a new one.");
router.post("/forgot-password", recoveryLimiter, validate(zod.object({ email: zod.string().trim().email().toLowerCase() }).strict()), forgotPassword);
router.post("/reset-password", recoveryLimiter, validate(zod.object({ token: tokenSchema, password: newPasswordSchema }).strict()), resetPassword);
router.post("/verify-email", recoveryLimiter, validate(zod.object({ token: tokenSchema }).strict()), verifyEmail);
router.post("/verification-email", authMiddleware, resendLimiter, resendVerification);

// Separate account-keyed budget so password confirmation attempts cannot use
// multiple IPs to bypass the limit or consume another user's login allowance.
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: req => req.user!.id,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many password-change attempts. Please try again later." },
});
router.post("/password", authMiddleware, passwordLimiter, validate(zod.object({
  currentPassword: zod.string().min(1).max(1024),
  newPassword: newPasswordSchema,
}).strict()), changePassword);

router.post("/google/link", authLimiter, authMiddleware, validate(googleSchema.extend({ password: zod.string().min(1).max(1024) })), linkGoogle);
router.patch("/profile", authMiddleware, validate(zod.object({ firstName: zod.string().trim().min(1).max(30), lastName: zod.string().trim().min(1).max(30) })), updateProfile);
router.post("/logout", logout);
router.post("/logout-all", authMiddleware, logoutAll);
router.get("/me", authMiddleware, getMe);

export default router;
