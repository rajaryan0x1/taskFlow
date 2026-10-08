import type { Request, Response, NextFunction } from "express";
import { authenticateSession } from "../services/session.js";

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; role: "app_admin" | "user" };
    }
  }
}
export const authMiddleware = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const { user } = await authenticateSession(req.headers.cookie);
    req.user = { id: user._id.toString(), role: user.appRole };
    next();
  } catch (error) { next(error); }
};
