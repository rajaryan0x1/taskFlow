// task routes

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
    requireProjectAccess,
    requirePermission,
} from "../middleware/rbac.js";
import {
    createTask,
    getTasksByProject,
    getTaskById,
    updateTask,
    deleteTask,
    assignTask,
    getTaskComments,
    createTaskComment,
    deleteTaskComment,
    getTaskActivity,
} from "../controllers/task.controller.js";

const router = Router();

router.post("/", authMiddleware, createTask);

export const projectTaskRoutes = Router({ mergeParams: true });

// Changes made here 
// router -> projectTaskRoutes

projectTaskRoutes.get(
    "/",
    authMiddleware,
    requireProjectAccess,
    getTasksByProject
);

projectTaskRoutes.get(
    "/:taskId",
    authMiddleware,
    requireProjectAccess, // Need to pass projectId somehow to check access, maybe via query or middleware that fetches task and checks project access
    getTaskById
);



projectTaskRoutes.patch(
    "/:taskId",
    authMiddleware,
    requireProjectAccess,
    updateTask
);


projectTaskRoutes.delete(
    "/:taskId",
    authMiddleware,
    requireProjectAccess,
    requirePermission("TASK_DELETE"),
    deleteTask
);


projectTaskRoutes.patch(
    "/:taskId/assign",
    authMiddleware,
    requireProjectAccess,
    requirePermission("TASK_UPDATE_ANY"),
    assignTask
);

projectTaskRoutes.get(
    "/:taskId/comments",
    authMiddleware,
    requireProjectAccess,
    getTaskComments
);

projectTaskRoutes.get(
    "/:taskId/activity",
    authMiddleware,
    requireProjectAccess,
    getTaskActivity
);

projectTaskRoutes.post(
    "/:taskId/comments",
    authMiddleware,
    requireProjectAccess,
    requirePermission("COMMENT_SEND"),
    createTaskComment
);

projectTaskRoutes.delete(
    "/:taskId/comments/:commentId",
    authMiddleware,
    requireProjectAccess,
    deleteTaskComment
);

export default router;