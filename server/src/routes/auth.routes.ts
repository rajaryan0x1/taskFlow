import { Router } from "express";
import rateLimit from "express-rate-limit";
import zod from "zod";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import {
  register,
  login,
  logout,
  getMe,
} from "../controllers/auth.controller.js";

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Please try again later." },
});

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

// ─── Routes 
router.post("/register", authLimiter, validate(registerSchema), register);
router.post("/login", authLimiter, validate(loginSchema), login);
router.post("/logout", logout);
router.get("/me", authMiddleware, getMe);

export default router;
