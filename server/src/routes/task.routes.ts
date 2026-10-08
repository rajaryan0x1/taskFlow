import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireProjectAccess, requirePermission } from "../middleware/rbac.js";
import { loadTask } from "../middleware/task.middleware.js";
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

// Deprecated alias
router.post("/", authMiddleware, (req, _res, next) => {
    req.params.projectId = req.body?.projectId;
    next();
}, requireProjectAccess, requirePermission("TASK_CREATE"), createTask);

export const projectTaskRoutes = Router({ mergeParams: true });

projectTaskRoutes.post(
    "/",
    authMiddleware,
    requireProjectAccess,
    requirePermission("TASK_CREATE"),
    createTask
);

projectTaskRoutes.get(
    "/",
    authMiddleware,
    requireProjectAccess,
    getTasksByProject
);

projectTaskRoutes.get(
    "/:taskId",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    getTaskById
);

projectTaskRoutes.patch(
    "/:taskId",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    updateTask
);

projectTaskRoutes.delete(
    "/:taskId",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    requirePermission("TASK_DELETE"),
    deleteTask
);

projectTaskRoutes.patch(
    "/:taskId/assign",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    requirePermission("TASK_UPDATE_ANY"),
    assignTask
);

projectTaskRoutes.get(
    "/:taskId/comments",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    getTaskComments
);

projectTaskRoutes.post(
    "/:taskId/comments",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    requirePermission("COMMENT_SEND"),
    createTaskComment
);

projectTaskRoutes.delete(
    "/:taskId/comments/:commentId",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    deleteTaskComment
);

projectTaskRoutes.get(
    "/:taskId/activity",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    getTaskActivity
);

export default router;
