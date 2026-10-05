import type { Request, Response } from "express";
import zod from "zod";
import { Task, TaskStatus, TaskPriority } from "../models/Task.js";
import { Project } from "../models/Project.js";
// import User from "../models/User.js";
import { ProjectRole } from "../types/roles.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Types } from "mongoose";
import {
    broadcastActivityCreated,
    broadcastTaskCreate,
    broadcastTaskDelete,
    broadcastTaskUpdate,
} from "../sockets/task.socket.js";
import { createNotification } from "../utils/notifications.js";
import { Comment } from "../models/Comment.js";
import { Activity, type ActivityType, type IActivity } from "../models/Activity.js";
import { broadcastCommentCreated, broadcastCommentDeleted } from "../sockets/task.socket.js";

// ─── Validation Schemas ───────────────────────────────────────────────────────

const createTaskSchema = zod.object({
    title: zod.string().min(2).max(150),
    description: zod.string().max(1000).optional(),
    status: zod
        .enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE])
        .default(TaskStatus.TODO),
    priority: zod
        .enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH])
        .default(TaskPriority.MEDIUM),
    assignee: zod.string().optional(),
    dueDate: zod.iso.datetime().optional(),
    projectId: zod.string().optional(),
});

const updateTaskSchema = zod.object({
    title: zod.string().min(2).max(150).optional(),
    description: zod.string().max(1000).optional(),
    status: zod
        .enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE])
        .optional(),
    priority: zod
        .enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH])
        .optional(),
    assignee: zod.string().optional(),
    dueDate: zod.iso.datetime().optional(),
});

const assignTaskSchema = zod.object({
    assignee: zod.string(), // Can be empty string to unassign
});

const createCommentSchema = zod.object({
    body: zod.string().trim().min(1).max(2000),
});

const logActivity = async (
    projectId: Types.ObjectId | string,
    taskId: Types.ObjectId | string,
    actorId: string,
    type: ActivityType,
    meta: Record<string, unknown> = {},
    io?: any
): Promise<IActivity> => {
    const activity = await Activity.create({ project: projectId, task: taskId, actor: actorId, type, meta });
    if (io) broadcastActivityCreated(io, projectId.toString(), activity);
    return activity;
};

const queryFilterSchema = zod.object({
    status: zod
        .enum([TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE])
        .optional(),
    assignee: zod.string().optional(),
    priority: zod
        .enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH])
        .optional(),
});

// ─── Controllers ──────────────────────────────────────────────────────────────

// POST /api/v1/tasks
export const createTask = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const parseResult = createTaskSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw ApiError.badRequest(
                parseResult.error.issues.map((e) => e.message).join(", ")
            );
        }

        const { title, description, status, priority, assignee, dueDate } = parseResult.data;
        const projectIdRaw = req.params.projectId || parseResult.data.projectId;
        if (!projectIdRaw || typeof projectIdRaw !== 'string') throw ApiError.badRequest("Project ID is required");
        const projectId = projectIdRaw;

        // Validate projectId
        if (!Types.ObjectId.isValid(projectId)) {
            throw ApiError.badRequest("Invalid project ID");
        }

        // Check project exists and user is a member
        const project = await Project.findById(projectId);
        if (!project) {
            throw ApiError.notFound("Project not found");
        }

        const memberRole = project.getMemberRole(req.user!.id);
        if (!memberRole) {
            throw ApiError.forbidden("You are not a member of this project");
        }

        // If assignee provided, validate they're a member
        if (assignee) {
            if (!Types.ObjectId.isValid(assignee)) {
                throw ApiError.badRequest("Invalid assignee ID");
            }

            const assigneeRole = project.getMemberRole(assignee);
            if (!assigneeRole) {
                throw ApiError.badRequest("Assignee must be a member of the project");
            }
        }

        const task = await Task.create({
            title,
            ...(description && { description }),
            status,
            priority,
            project: projectId,
            ...(assignee && { assignee }),
            ...(dueDate && { dueDate: new Date(dueDate) }),
            createdBy: req.user!.id,
        });
        await logActivity(projectId, task._id, req.user!.id, "created", {}, req.app.locals.io);

        const populatedTask = await Task.findById(task._id)
            .populate("project", "name")
            .populate("assignee", "firstName lastName email username")
            .populate("createdBy", "firstName lastName email username");


        const io = req.app.locals.io;
        if (io) {
            broadcastTaskCreate(io, projectId, populatedTask);
        }

        res.status(201).json({
            success: true,
            message: "Task created successfully",
            data: populatedTask,
        });
    }
);

// GET /api/v1/projects/:projectId/tasks
export const getTasksByProject = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const projectId = req.projectMembership!.project._id;

        // Parse query filters
        const filterResult = queryFilterSchema.safeParse(req.query);
        const filters = filterResult.success ? filterResult.data : {};

        const query: any = {
            project: projectId,
            isArchived: false,
        };

        if (filters.status) query.status = filters.status;
        if (filters.priority) query.priority = filters.priority;
        if (filters.assignee) query.assignee = filters.assignee;

        const tasks = await Task.find(query)
            .populate("assignee", "firstName lastName email username")
            .populate("createdBy", "firstName lastName email username")
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: tasks.length,
            data: tasks,
        });
    }
);

// GET /api/v1/tasks/:taskId
export const getTaskById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { taskId } = req.params;
        if (!taskId || typeof taskId !== "string") {
            throw ApiError.badRequest("Task ID is required");
        }
        if (!Types.ObjectId.isValid(taskId)) {
            throw ApiError.badRequest("Invalid task ID");
        }

        const task = req.task;
        await task.populate("project", "name");
        await task.populate("assignee", "firstName lastName email username");
        await task.populate("createdBy", "firstName lastName email username");

        res.status(200).json({
            success: true,
            data: task,
        });
    }
);

// PATCH /api/v1/tasks/:taskId
export const updateTask = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { taskId } = req.params;
        if (!taskId || typeof taskId !== "string") {
            throw ApiError.badRequest("Task ID is required");
        }

        if (!Types.ObjectId.isValid(taskId)) {
            throw ApiError.badRequest("Invalid task ID");
        }

        const parseResult = updateTaskSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw ApiError.badRequest(
                parseResult.error.issues.map((e) => e.message).join(", ")
            );
        }

        const updates = parseResult.data;

        if (Object.keys(updates).length === 0) {
            throw ApiError.badRequest("At least one field is required to update");
        }

        const task = req.task;

        const userRole = req.projectMembership!.role;
        const previousStatus = task.status;
        const previousAssignee = task.assignee?.toString() ?? null;

        // Members can only update tasks assigned to them
        if (userRole === ProjectRole.MEMBER) {
            if (
                !task.assignee ||
                task.assignee.toString() !== req.user!.id.toString()
            ) {
                throw ApiError.forbidden(
                    "You can only update tasks assigned to you"
                );
            }

            // Members can only update status
            const allowedUpdates = ["status"];
            const attemptedUpdates = Object.keys(updates).filter(k => updates[k as keyof typeof updates] !== undefined);
            const invalidUpdates = attemptedUpdates.filter(k => !allowedUpdates.includes(k));
            if (invalidUpdates.length > 0) {
                throw ApiError.forbidden(
                    `As a member, you can only update: ${allowedUpdates.join(", ")}`
                );
            }
        }

        // If assignee is being updated, validate they're a member
        if (updates.assignee !== undefined && updates.assignee !== "") {
            if (!Types.ObjectId.isValid(updates.assignee)) {
                throw ApiError.badRequest("Invalid assignee ID");
            }

            const project = req.projectMembership!.project;
            const assigneeRole = project.getMemberRole(updates.assignee);
            if (!assigneeRole) {
                throw ApiError.badRequest("Assignee must be a member of the project");
            }
        }

        // Apply updates
        if (updates.title !== undefined) task.title = updates.title;
        if (updates.description !== undefined)
            task.description = updates.description;
        if (updates.status !== undefined) task.status = updates.status;
        if (updates.priority !== undefined) task.priority = updates.priority;
        if (updates.assignee !== undefined) {
            task.assignee = updates.assignee === "" ? null : (updates.assignee as any);
        }
        if (updates.dueDate !== undefined) {
            task.dueDate = new Date(updates.dueDate);
        }

        await task.save();

        if (updates.status !== undefined && updates.status !== previousStatus) {
            await logActivity(task.project, task._id, req.user!.id, "status_changed", {
                from: previousStatus,
                to: updates.status,
            }, req.app.locals.io);
        }
        if (updates.assignee !== undefined && (updates.assignee || null) !== previousAssignee) {
            await logActivity(task.project, task._id, req.user!.id, "assigned", {
                assignee: updates.assignee || null,
            }, req.app.locals.io);
            if (updates.assignee) {
                await createNotification(req.app.locals.io, updates.assignee, "task_assigned", {
                    taskId: task._id.toString(),
                    taskTitle: task.title,
                    projectId: task.project.toString(),
                });
            }
        }

        const updatedTask = await Task.findById(task._id)
            .populate("project", "name")
            .populate("assignee", "firstName lastName email username")
            .populate("createdBy", "firstName lastName email username");

        // TODO: Socket.io broadcast here when status changes [DONE]
        // if (updates.status) { io.to(projectId).emit("task:updated", updatedTask) }

        const io = req.app.locals.io;
        if (io) {
            broadcastTaskUpdate(
                io,
                req.projectMembership!.project._id.toString(),
                updatedTask
            );
        }

        res.status(200).json({
            success: true,
            message: "Task updated successfully",
            data: updatedTask,
        });
    }
);

// DELETE /api/v1/tasks/:taskId
export const deleteTask = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { taskId } = req.params;
        const hardDelete = req.query.hard === "true";
        if (!taskId || typeof taskId !== "string") {
            throw ApiError.badRequest("Task ID is required");
        }

        if (!Types.ObjectId.isValid(taskId)) {
            throw ApiError.badRequest("Invalid task ID");
        }

        const task = req.task;

        if (hardDelete) {
                        await Task.findByIdAndDelete(taskId);
            await Comment.deleteMany({ task: taskId });
            await Activity.deleteMany({ task: taskId });
            res.status(200).json({
                success: true,
                message: "Task permanently deleted",
            });
        } else {
            task.isArchived = true;
            await task.save();

            const io = req.app.locals.io;
            if (io) {
                broadcastTaskDelete(
                    io,
                    req.projectMembership!.project._id.toString(),
                    taskId
                );
            }

            res.status(200).json({
                success: true,
                message: "Task archived successfully",
                data: task,
            });
        }
    }
);

// PATCH /api/v1/tasks/:taskId/assign
export const assignTask = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { taskId } = req.params;
        if (!taskId || typeof taskId !== "string") {
            throw ApiError.badRequest("Task ID is required");
        }

        if (!Types.ObjectId.isValid(taskId)) {
            throw ApiError.badRequest("Invalid task ID");
        }

        const parseResult = assignTaskSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw ApiError.badRequest(
                parseResult.error.issues.map((e) => e.message).join(", ")
            );
        }

        const { assignee } = parseResult.data;

        const task = req.task;

        // Empty string means unassign
        if (assignee === "") {
            task.assignee = undefined as any;
        } else {
            if (!Types.ObjectId.isValid(assignee)) {
                throw ApiError.badRequest("Invalid assignee ID");
            }

            const project = req.projectMembership!.project;
            const assigneeRole = project.getMemberRole(assignee);
            if (!assigneeRole) {
                throw ApiError.badRequest("Assignee must be a member of the project");
            }

            task.assignee = assignee as any;
        }

        await task.save();

        await logActivity(task.project, task._id, req.user!.id, "assigned", {
            assignee: assignee || null,
        }, req.app.locals.io);
        if (assignee) {
            await createNotification(req.app.locals.io, assignee, "task_assigned", {
                taskId: task._id.toString(),
                taskTitle: task.title,
                projectId: task.project.toString(),
            });
        }

        const updatedTask = await Task.findById(task._id)
            .populate("project", "name")
            .populate("assignee", "firstName lastName email username")
            .populate("createdBy", "firstName lastName email username");

        res.status(200).json({
            success: true,
            message: assignee === "" ? "Task unassigned" : "Task assigned successfully",
            data: updatedTask,
        });
    }
);

export const getTaskComments = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { taskId } = req.params;
        if (!taskId || typeof taskId !== "string" || !Types.ObjectId.isValid(taskId)) {
            throw ApiError.badRequest("Invalid task ID");
        }

        const task = req.task;

        const comments = await Comment.find({ task: taskId })
            .populate("author", "firstName lastName username")
            .sort({ createdAt: 1 });

        res.status(200).json({ success: true, data: comments });
    }
);

export const createTaskComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { taskId } = req.params;
        if (!taskId || typeof taskId !== "string" || !Types.ObjectId.isValid(taskId)) {
            throw ApiError.badRequest("Invalid task ID");
        }

        const parseResult = createCommentSchema.safeParse(req.body);
        if (!parseResult.success) {
            throw ApiError.badRequest(parseResult.error.issues.map((issue) => issue.message).join(", "));
        }

        const task = req.task;

        const comment = await Comment.create({
            task: taskId,
            author: req.user!.id,
            body: parseResult.data.body,
        });
        await logActivity(task.project, task._id, req.user!.id, "commented", {}, req.app.locals.io);
        const populatedComment = await Comment.findById(comment._id)
            .populate("author", "firstName lastName username");

        const io = req.app.locals.io;
        if (io) broadcastCommentCreated(io, req.projectMembership!.project._id.toString(), populatedComment);

        res.status(201).json({ success: true, data: populatedComment });
    }
);

export const deleteTaskComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { taskId, commentId } = req.params;
        if (
            !taskId || typeof taskId !== "string" || !Types.ObjectId.isValid(taskId) ||
            !commentId || typeof commentId !== "string" || !Types.ObjectId.isValid(commentId)
        ) {
            throw ApiError.badRequest("Invalid task or comment ID");
        }

        const task = req.task;

        const comment = await Comment.findOne({ _id: commentId, task: taskId });
        if (!comment) throw ApiError.notFound("Comment not found");

        const canDeleteAny = req.projectMembership!.role === ProjectRole.OWNER ||
            req.projectMembership!.role === ProjectRole.ADMIN;
        if (!canDeleteAny && comment.author.toString() !== req.user!.id) {
            throw ApiError.forbidden("You can only delete your own comments");
        }

        await comment.deleteOne();
        const io = req.app.locals.io;
        if (io) broadcastCommentDeleted(io, req.projectMembership!.project._id.toString(), commentId);

        res.status(200).json({ success: true, message: "Comment deleted" });
    }
);

export const getTaskActivity = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        const { taskId } = req.params;
        if (!taskId || typeof taskId !== "string" || !Types.ObjectId.isValid(taskId)) {
            throw ApiError.badRequest("Invalid task ID");
        }

        const task = req.task;

        const activity = await Activity.find({ task: taskId })
            .populate("actor", "firstName lastName username")
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: activity });
    }
);
