import type { RequestHandler } from "express";
import type { z } from "zod";
import { parseInput } from "../utils/input.js";

export const validate = (schema: z.ZodType): RequestHandler => (req, _res, next) => {
  try { req.body = parseInput(schema, req.body); next(); }
  catch (error) { next(error); }
};
