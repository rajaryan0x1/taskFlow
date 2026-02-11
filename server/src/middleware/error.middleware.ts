import type { Request, Response, NextFunction } from "express";

import { ApiError } from "../utils/ApiError.js";



export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Known, operational error — safe to send details to client
    if (err instanceof ApiError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
        });
        return;
    }

    // Unknown error handling here
    console.error("[unhandled error]", err);

    res.status(500).json({
        success: false,
        message: "Internal server error",
    });
};
