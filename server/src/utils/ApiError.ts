export type FieldErrors = Record<string, string[] | undefined>;

export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly errors: FieldErrors | undefined;

    constructor(message: string, statusCode: number, errors?: FieldErrors, isOperational = true) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }

    static badRequest(message: string, errors?: FieldErrors): ApiError {
        return new ApiError(message, 400, errors);
    }

    static unauthorized(message: string): ApiError {
        return new ApiError(message, 401);
    }

    static forbidden(message: string): ApiError {
        return new ApiError(message, 403);
    }

    static notFound(message: string): ApiError {
        return new ApiError(message, 404);
    }

    static conflict(message: string): ApiError {
        return new ApiError(message, 409);
    }

    static internal(message = "Internal Server Error"): ApiError {
        return new ApiError(message, 500, undefined, false);
    }
}
