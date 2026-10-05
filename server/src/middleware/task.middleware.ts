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
