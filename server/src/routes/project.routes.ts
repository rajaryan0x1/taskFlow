import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
    requireProjectAccess,
    requireArchivedProjectAccess,
    requirePermission,
} from "../middleware/rbac.js";
import {
    createProject,
    getMyProjects,
    getProjectById,
    updateProject,
    deleteProject,
    inviteMember,
    removeMember,
    transferOwnership,
    restoreProject,
} from "../controllers/project.controller.js";

import analyticsRoutes from "./analytics.routes.js";

const router = Router();



// Create a new project
router.post("/", authMiddleware, createProject);

router.get("/", authMiddleware, getMyProjects);

router.get(
    "/:projectId",
    authMiddleware,
    requireProjectAccess,
    requireArchivedProjectAccess,
    getProjectById
);

// Update project (owner or admin only)
router.patch(
    "/:projectId",
    authMiddleware,
    requireProjectAccess,
    requireArchivedProjectAccess,
    requirePermission("PROJECT_UPDATE"),
    updateProject
);

// Delete/archive project (owner only)
router.delete(
    "/:projectId",
    authMiddleware,
    requireArchivedProjectAccess,
    requireArchivedProjectAccess,
    requirePermission("PROJECT_DELETE"),
    deleteProject
);


// Restore an archived project (owner or admin only)
router.post(
    "/:projectId/restore",
    authMiddleware,
    requireArchivedProjectAccess,
    requirePermission("PROJECT_UPDATE"),
    restoreProject
);

//  Member management 

// Invite a member (owner or admin)
router.post(
    "/:projectId/members",
    authMiddleware,
    requireProjectAccess,
    requireArchivedProjectAccess,
    requirePermission("PROJECT_INVITE_MEMBER"),
    inviteMember
);

// Remove a member (owner or admin)
router.delete(
    "/:projectId/members/:userId",
    authMiddleware,
    requireProjectAccess,
    requireArchivedProjectAccess,
    requirePermission("PROJECT_REMOVE_MEMBER"),
    removeMember
);

router.post(
    "/:projectId/transfer-ownership",
    authMiddleware,
    requireProjectAccess,
    requireArchivedProjectAccess,
    requirePermission("PROJECT_TRANSFER_OWNERSHIP"),
    transferOwnership
);

// Added analytics routes (MongoDB aggregation pipelines) :)
router.use("/:projectId/analytics", analyticsRoutes);
export default router;