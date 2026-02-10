import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { Request, Response, NextFunction } from "express";

// JWT Payload 

interface AuthTokenPayload {
  sub: string;
  role: "app_admin" | "user";
  iat: number;
  exp: number;
}

// Request Augmentation 
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "app_admin" | "user";
      };
    }
  }
}


export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized: no token provided" });
    return;
  }

  const token = authHeader.split(" ")[1];
  if(!token){
    res.status(401).json({ message: "Unauthorized: token is malformed" });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as unknown as AuthTokenPayload;

    
    if (!decoded?.sub || !decoded?.role) {
      res.status(401).json({ message: "Unauthorized: invalid token payload" });
      return;
    }

    req.user = {
      id: decoded.sub,
      role: decoded.role,
    };

    next();
  } catch (err) {
    // jwt.verify throws TokenExpiredError, JsonWebTokenError, etc.
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ message: "Unauthorized: token has expired" });
      return;
    }
    res.status(401).json({ message: "Unauthorized: invalid token" });
  }
};