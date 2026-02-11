export class ApiError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string , statusCode: number, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }


    static badRequest(message: string): ApiError {
        return new ApiError(message, 400);
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
    
    static internal(message = "Internal Server Error"): ApiError {
        return new ApiError(message, 500);
    }

}

