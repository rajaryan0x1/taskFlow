import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireProjectAccess, requireArchivedProjectAccess, requirePermission } from "../middleware/rbac.js";
import { loadTask, requireActiveTask, requireTaskVersion } from "../middleware/task.middleware.js";
import {
    createTask,
    restoreTask,
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
}, requireProjectAccess, requireArchivedProjectAccess, requirePermission("TASK_CREATE"), createTask);

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
    requireArchivedProjectAccess,
    getTasksByProject
);

projectTaskRoutes.get(
    "/:taskId",
    authMiddleware,
    requireArchivedProjectAccess,
    loadTask,
    getTaskById
);

projectTaskRoutes.patch(
    "/:taskId",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    requireActiveTask,
    requireTaskVersion,
    updateTask
);

projectTaskRoutes.delete(
    "/:taskId",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    requirePermission("TASK_DELETE"),
    requireTaskVersion,
    deleteTask
);

projectTaskRoutes.patch(
    "/:taskId/assign",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    requireActiveTask,
    requirePermission("TASK_UPDATE_ANY"),
    requireTaskVersion,
    assignTask
);

projectTaskRoutes.get(
    "/:taskId/comments",
    authMiddleware,
    requireArchivedProjectAccess,
    loadTask,
    getTaskComments
);

projectTaskRoutes.post(
    "/:taskId/comments",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    requireActiveTask,
    requirePermission("COMMENT_SEND"),
    createTaskComment
);

projectTaskRoutes.delete(
    "/:taskId/comments/:commentId",
    authMiddleware,
    requireProjectAccess,
    loadTask,
    requireActiveTask,
    deleteTaskComment
);

projectTaskRoutes.get(
    "/:taskId/activity",
    authMiddleware,
    requireArchivedProjectAccess,
    loadTask,
    getTaskActivity
);

projectTaskRoutes.post("/:taskId/restore", authMiddleware, requireProjectAccess, loadTask, requirePermission("TASK_UPDATE_ANY"), requireTaskVersion, restoreTask);

export default router;
