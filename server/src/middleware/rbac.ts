import type { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { Project } from "../models/Project.js";
import type { IProject } from "../models/Project.js";
import { ProjectRole, AppRole, PERMISSIONS, type PermissionKey } from "../types/roles.js";
import { ApiError } from "../utils/ApiError.js";

declare global {
    namespace Express {
        interface Request {
            projectMembership?: {
                project: IProject;
                role: ProjectRole;
            };
        }
    }
}

export const requireProjectAccess = async (
    req: Request,
    _res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { projectId } = req.params;
        if (!projectId || typeof projectId !== "string") {
            throw ApiError.badRequest("Project ID is required");
        }

        // Validate projectId is a valid ObjectId before hitting the DB
        if (!Types.ObjectId.isValid(projectId)) {
            throw ApiError.badRequest("Invalid project ID");
        }

        const project = await Project.findById(projectId);

        if (!project) {
            throw ApiError.notFound("Project not found");
        }

        if (project.isArchived) {
            throw ApiError.forbidden("This project has been archived");
        }

        // app_admin bypasses membership — attach owner role as a stand-in
        // so requirePermission() checks don't break downstream
        if (req.user?.role === AppRole.APP_ADMIN) {
            req.projectMembership = { project, role: ProjectRole.OWNER };
            return next();
        }

        // Find the user's role in this project
        const memberRole = project.getMemberRole(req.user!.id);

        if (!memberRole) {
            throw ApiError.forbidden("You are not a member of this project");
        }

        // Attach to req — controllers and requirePermission() read from here
        req.projectMembership = { project, role: memberRole };

        next();
    } catch (err) {
        next(err);
    }
}



export const requirePermission = (permission: PermissionKey) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const membership = req.projectMembership;

        // Should never happen if requireProjectAccess runs first — but guard anyway
        if (!membership) {
            return next(ApiError.internal("Project membership not found on request"));
        }

        const allowedRoles = PERMISSIONS[permission] as readonly ProjectRole[];

        if (!allowedRoles.includes(membership.role)) {
            return next(
                ApiError.forbidden("You don't have permission to perform this action")
            );
        }

        next();
    };
};
