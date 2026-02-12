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
} from "../controllers/task.controller.js";

const router = Router();

router.post("/", authMiddleware, createTask);

export const projectTaskRoutes = Router({ mergeParams: true });

projectTaskRoutes.get(
    "/",
    authMiddleware,
    requireProjectAccess,
    getTasksByProject
);

router.get(
    "/:taskId",
    authMiddleware,
    requireProjectAccess, // Need to pass projectId somehow to check access, maybe via query or middleware that fetches task and checks project access
    getTaskById
);



router.patch(
    "/:taskId",
    authMiddleware,
    requireProjectAccess,
    requirePermission("TASK_UPDATE_ANY"), // Members who own the task bypass this in controller
    updateTask
);


router.delete(
    "/:taskId",
    authMiddleware,
    requireProjectAccess,
    requirePermission("TASK_DELETE"),
    deleteTask
);


router.patch(
    "/:taskId/assign",
    authMiddleware,
    requireProjectAccess,
    requirePermission("TASK_UPDATE_ANY"),
    assignTask
);

export default router;