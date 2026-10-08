
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { requireArchivedProjectAccess } from "../middleware/rbac.js";
import {
    getProjectProgress,
    getUserPerformance,
    getTimeline,
} from "../controllers/analytics.controller.js";

const router = Router({ mergeParams: true });

// All routes require auth and project membership
router.use(authMiddleware);
router.use(requireArchivedProjectAccess);

// GET /api/v1/projects/:projectId/analytics/progress
router.get("/progress", getProjectProgress);

// GET /api/v1/projects/:projectId/analytics/users
router.get("/users", getUserPerformance);

// GET /api/v1/projects/:projectId/analytics/timeline
router.get("/timeline", getTimeline);

export default router;