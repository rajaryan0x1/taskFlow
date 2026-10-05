import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ApiError } from "../utils/ApiError.js";

export const validate = (
  schema: z.ZodTypeAny,
  target: "body" | "query" | "params" = "body"
) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parseResult = schema.safeParse(req[target]);
    if (!parseResult.success) {
      next(
        ApiError.badRequest("Validation failed", parseResult.error.flatten().fieldErrors as any)
      );
    } else {
      req[target] = parseResult.data;
      next();
    }
  };
};
