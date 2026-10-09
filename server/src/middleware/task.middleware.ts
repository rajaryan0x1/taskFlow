import type { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Task } from "../models/Task.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Extend Request to include task
declare global {
    namespace Express {
        interface Request {
            task?: any;
        }
    }
}

export const loadTask = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    const { taskId } = req.params;
    if (!taskId || typeof taskId !== "string" || !Types.ObjectId.isValid(taskId)) {
        throw ApiError.badRequest("Invalid task ID");
    }

    const task = await Task.findById(taskId);
    if (!task) {
        throw ApiError.notFound("Task not found");
    }

    // If accessed through projectTaskRoutes, verify it belongs to the project
    if (req.params.projectId) {
        if (task.project.toString() !== req.params.projectId) {
            throw ApiError.forbidden("Task does not belong to this project");
        }
    }

    req.task = task;
    next();
});

export const requireActiveTask = (req: Request, _res: Response, next: NextFunction) => {
    if (req.task?.isArchived) return next(ApiError.forbidden("Archived tasks are read-only. Restore the task first."));
    next();
};

export const requireTaskVersion = (req: Request, _res: Response, next: NextFunction) => {
    const match = req.get("If-Match");
    if (!match || !/^"\d+"$/.test(match)) return next(new ApiError("Reload the task and provide its version in If-Match", 428));
    if (Number(match.slice(1, -1)) !== req.task.__v) return next(ApiError.conflict("This task changed since you opened it. Close and reopen it before saving."));
    next();
};
