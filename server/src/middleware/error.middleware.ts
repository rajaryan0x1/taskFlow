import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import { ApiError, type FieldErrors } from "../utils/ApiError.js";

interface ErrorBody {
    success: false;
    message: string;
    errors?: FieldErrors;
}

const send = (res: Response, status: number, message: string, errors?: FieldErrors): void => {
    const body: ErrorBody = { success: false, message };
    if (errors && Object.keys(errors).length > 0) body.errors = errors;
    res.status(status).json(body);
};

const isMongoDuplicateKey = (
    err: unknown
): err is { code: number; keyValue?: Record<string, unknown> } =>
    typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;

/** Errors raised by express/body-parser carry an HTTP status of their own. */
const httpStatusOf = (err: unknown): number | undefined => {
    if (typeof err !== "object" || err === null) return undefined;
    const status = (err as { status?: unknown; statusCode?: unknown }).status ??
        (err as { statusCode?: unknown }).statusCode;
    return typeof status === "number" && status >= 400 && status < 500 ? status : undefined;
};

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    // Known, operational error — safe to send details to client
    if (err instanceof ApiError) {
        send(res, err.statusCode, err.message, err.errors);
        return;
    }

    if (err instanceof mongoose.Error.VersionError) {
        send(res, 409, "This record changed. Refresh and try again.");
        return;
    }

    // Invalid ObjectId or type in a query (e.g. ?assignee=abc)
    if (err instanceof mongoose.Error.CastError) {
        send(res, 400, `Invalid value for "${err.path}"`);
        return;
    }

    // Schema validation failed on save
    if (err instanceof mongoose.Error.ValidationError) {
        const errors: FieldErrors = {};
        for (const [field, detail] of Object.entries(err.errors)) {
            errors[field] = [detail.message];
        }
        send(res, 400, "Validation failed", errors);
        return;
    }

    // Unique index violation
    if (isMongoDuplicateKey(err)) {
        const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
        send(res, 409, `A record with that ${field} already exists`);
        return;
    }

    // Malformed JSON body, payload too large, etc.
    const status = httpStatusOf(err);
    if (status) {
        const message = err instanceof SyntaxError ? "Malformed JSON body" : (err as Error).message;
        send(res, status, message);
        return;
    }

    // Unknown error handling here
    console.error("[unhandled error]", err);
    send(res, 500, "Internal server error");
};
