import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
    requireProjectAccess,
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
} from "../controllers/project.controller.js";

const router = Router();



// Create a new project
router.post("/", authMiddleware, createProject);

router.get("/", authMiddleware, getMyProjects);

router.get(
    "/:projectId",
    authMiddleware,
    requireProjectAccess,
    getProjectById
);

// Update project (owner or admin only)
router.patch(
    "/:projectId",
    authMiddleware,
    requireProjectAccess,
    requirePermission("PROJECT_UPDATE"),
    updateProject
);

// Delete/archive project (owner only)
router.delete(
    "/:projectId",
    authMiddleware,
    requireProjectAccess,
    requirePermission("PROJECT_DELETE"),
    deleteProject
);

// ─── Member management ────────────────────────────────────────────────────────

// Invite a member (owner or admin)
router.post(
    "/:projectId/members",
    authMiddleware,
    requireProjectAccess,
    requirePermission("PROJECT_INVITE_MEMBER"),
    inviteMember
);

// Remove a member (owner or admin)
router.delete(
    "/:projectId/members/:userId",
    authMiddleware,
    requireProjectAccess,
    requirePermission("PROJECT_REMOVE_MEMBER"),
    removeMember
);

export default router;