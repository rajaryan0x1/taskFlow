import { parseInput, cursorSchema, cursorFilter, pageResult, booleanQuery, objectId } from "../utils/input.js";
import { events } from "@taskflow/contracts";
import type { Request, Response } from "express";
import zod from "zod";
import { Types, type QueryFilter } from "mongoose";
import { Project, type IProject } from "../models/Project.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ProjectRole, canManageRole } from "../types/roles.js";
import {
  broadcastMemberAdded,
  broadcastMemberRemoved,
  broadcastOwnershipTransferred,
} from "../sockets/task.socket.js";
import { createNotification } from "../utils/notifications.js";

//  Validation Schema 

const createProjectSchema = zod.object({
    name: zod.string().trim().min(2).max(100),
    description: zod.string().trim().max(500).optional()
})

const updateProjectSchema = zod.object({
    name: zod.string().trim().min(2).max(100).optional(),
    description: zod.string().trim().max(500).optional()
})


const inviteMemberSchema = zod.object({
    userId: objectId,
    role: zod.enum([ProjectRole.ADMIN, ProjectRole.MEMBER]).default(ProjectRole.MEMBER)
})

// Controllers
// Post to api/v1/projects

export const createProject = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const parseResult = createProjectSchema.safeParse(req.body);

    if (!parseResult.success) {
        throw ApiError.badRequest(
            parseResult.error.issues.map((e) => e.message).join(", ")
        );
    }


    const { name, description } = parseResult.data;
    // Create project with creator as owner
    const project = await Project.create({
        name,
        ...(description && { description }),
        owner: req.user!.id,
        members: [
            {
                user: req.user!.id,
                role: ProjectRole.OWNER,
                joinedAt: new Date(),
            },
        ],
    });
    // missed to send the response earlier :(
     res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: project,
    });
})

// Get to api/v1/projects

export const getMyProjects = asyncHandler(async (req: Request, res: Response): Promise<void> => {

    const { cursor, limit, archived } = parseInput(cursorSchema.extend({ archived: booleanQuery }), req.query);
    const includeArchived = archived === "true";
    const query: QueryFilter<IProject> = {
        "members.user": req.user!.id,
        ...cursorFilter(cursor),
    };

    if (!includeArchived) {
        query.isArchived = false
    }

    const projects = await Project.find(query).populate("owner", "firstName  lastName email  username").populate("members.user", "firstName lastName email username").sort({ _id: -1 }).limit(limit + 1);

    res.status(200).json({
        success: true,
        ...pageResult(projects, limit)
    });

}
);

export const getProjectById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
        // requireProjectAccess already fetched and attached the project
        const project = await Project.findById(req.projectMembership!.project._id)
            .populate("owner", "firstName lastName email username")
            .populate("members.user", "firstName lastName email username");

        res.status(200).json({
            success: true,
            data: project,
        });
    }
);



// PATCH /api/v1/projects/:projectId
export const updateProject = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = updateProjectSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw ApiError.badRequest(
        parseResult.error.issues.map((e) => e.message).join(", ")
      );
    }

    const updates = parseResult.data;

    if (Object.keys(updates).length === 0) {
      throw ApiError.badRequest("At least one field is required to update");
    }

    const project = req.projectMembership!.project;

    // Update fields
    if (updates.name !== undefined) project.name = updates.name;
    if (updates.description !== undefined)
      project.description = updates.description;

    await project.save();
    req.app.locals.io?.to(`project:${project._id}`).emit(events.projectChanged, { projectId: project._id.toString() });

    res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: project,
    });
  }
);

// DELETE /api/v1/projects/:projectId
export const deleteProject = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const hardDelete = req.query.hard === "true";
    const project = req.projectMembership!.project;

    if (hardDelete) {
      // Hard delete — removes from DB entirely
      await Project.findByIdAndDelete(project._id);
      
      const { Task } = await import("../models/Task.js");
      const { Comment } = await import("../models/Comment.js");
      const { Activity } = await import("../models/Activity.js");
      
      const tasks = await Task.find({ project: project._id }).select("_id");
      const taskIds = tasks.map(t => t._id);
      
      await Task.deleteMany({ project: project._id });
      await Comment.deleteMany({ task: { $in: taskIds } });
      await Activity.deleteMany({ project: project._id });
      const io = req.app.locals.io;
      io?.to(`project:${project._id}`).emit(events.projectDeleted, { projectId: project._id.toString() });
      io?.in(`project:${project._id}`).socketsLeave(`project:${project._id}`);
      res.status(200).json({
        success: true,
        message: "Project permanently deleted",
      });
    } else {
      // Soft delete — just archive it
      project.isArchived = true;
      await project.save();
      req.app.locals.io?.to(`project:${project._id}`).emit(events.projectChanged, { projectId: project._id.toString() });

      res.status(200).json({
        success: true,
        message: "Project archived successfully",
        data: project,
      });
    }
  }
);

// POST /api/v1/projects/:projectId/members
export const inviteMember = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const parseResult = inviteMemberSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw ApiError.badRequest(
        parseResult.error.issues.map((e) => e.message).join(", ")
      );
    }

    const { userId, role } = parseResult.data;
    const project = req.projectMembership!.project;
    if (!canManageRole(req.projectMembership!.role, role)) {
      throw ApiError.forbidden("You cannot invite a member with an equal or higher role");
    }

    // Check if user exists
    const userToInvite = await User.findById(userId);
    if (!userToInvite) {
      throw ApiError.notFound("User not found");
    }

    // Check if user is already a member
    const existingMember = project.members.find(
      (m) => m.user.toString() === userId
    );
    if (existingMember) {
      throw ApiError.badRequest("User is already a member of this project");
    }

    // Remove the broken owner-invite path: ownership is now transferred explicitly.

    // Add member
    project.members.push({
      user: new Types.ObjectId(userId),
      role,
      joinedAt: new Date(),
    });

    await project.save();

    // Re-fetch with populated data
    const updatedProject = await Project.findById(project._id)
      .populate("owner", "firstName lastName email username")
      .populate("members.user", "firstName lastName email username");

    const io = req.app.locals.io;
    if (io && updatedProject) {
      const addedMember = updatedProject.members.find(
        (member) => member.user._id.toString() === userId
      );
      if (addedMember) broadcastMemberAdded(io, project._id.toString(), addedMember);
    }
    await createNotification(io, userId, "member_invited", {
      projectId: project._id.toString(),
      projectName: project.name,
    });

    res.status(200).json({
      success: true,
      message: "Member invited successfully",
      data: updatedProject,
    });
  }
);

// DELETE /api/v1/projects/:projectId/members/:userId
export const removeMember = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    if (!userId || typeof userId !== "string") {
      throw ApiError.badRequest("User ID is required");
    }
    const project = req.projectMembership!.project;

    // Find the member
    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      throw ApiError.notFound("Member not found in this project");
    }

    const targetMember = project.members[memberIndex];
    const actorRole = req.projectMembership!.role;

    if (project.owner.toString() === userId) {
      throw ApiError.badRequest("Cannot remove the owner. Transfer ownership first.");
    }

    if (!canManageRole(actorRole, targetMember!.role)) {
      throw ApiError.forbidden("You cannot remove a member with an equal or higher role");
    }

    // Remove member
    project.members.splice(memberIndex, 1);
    await project.save();

    const io = req.app.locals.io;
    if (io) broadcastMemberRemoved(io, project._id.toString(), userId);

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: project,
    });
  }
);

export const transferOwnership = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { newOwnerId } = req.body as { newOwnerId?: string };

    if (!newOwnerId || typeof newOwnerId !== "string") {
      throw ApiError.badRequest("newOwnerId is required");
    }

    const project = req.projectMembership!.project;

    if (project.owner.toString() === newOwnerId) {
      throw ApiError.badRequest("The selected user is already the owner");
    }

    const currentOwnerIndex = project.members.findIndex(
      (member) => member.user.toString() === project.owner.toString()
    );
    const newOwnerIndex = project.members.findIndex(
      (member) => member.user.toString() === newOwnerId
    );

    if (currentOwnerIndex === -1 || newOwnerIndex === -1) {
      throw ApiError.badRequest("The new owner must be an existing project member");
    }

    const currentOwnerMember = project.members[currentOwnerIndex];
    const newOwnerMember = project.members[newOwnerIndex];

    if (!currentOwnerMember || !newOwnerMember) {
      throw ApiError.badRequest("The ownership transfer could not be completed");
    }

    currentOwnerMember.role = ProjectRole.ADMIN;
    newOwnerMember.role = ProjectRole.OWNER;
    project.owner = new Types.ObjectId(newOwnerId);

    await project.save();

    const updatedProject = await Project.findById(project._id)
      .populate("owner", "firstName lastName email username")
      .populate("members.user", "firstName lastName email username");

    const io = req.app.locals.io;
    if (io) {
      broadcastOwnershipTransferred(io, project._id.toString(), newOwnerId);
    }

    res.status(200).json({
      success: true,
      message: "Ownership transferred successfully",
      data: updatedProject,
    });
  }
);

export const restoreProject = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const project = req.projectMembership!.project;
    if (!project.isArchived) {
      throw ApiError.badRequest("Project is not archived");
    }
    project.isArchived = false;
    await project.save();
    req.app.locals.io?.to(`project:${project._id}`).emit(events.projectChanged, { projectId: project._id.toString() });
    res.status(200).json({
      success: true,
      message: "Project restored successfully",
      data: project,
    });
  }
);

export const changeMemberRole = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { role: newRole } = req.body;

    if (!userId || typeof userId !== "string") {
      throw ApiError.badRequest("User ID is required");
    }

    if (!Object.values(ProjectRole).includes(newRole)) {
      throw ApiError.badRequest("Invalid role");
    }

    if (newRole === ProjectRole.OWNER) {
      throw ApiError.badRequest("Use the transfer ownership endpoint to assign an owner");
    }

    const project = req.projectMembership!.project;
    const actorRole = req.projectMembership!.role;

    const member = project.members.find((m) => m.user.toString() === userId);
    if (!member) {
      throw ApiError.notFound("Member not found in this project");
    }

    if (member.role === ProjectRole.OWNER) {
      throw ApiError.badRequest("Cannot change the role of the owner");
    }

    if (!canManageRole(actorRole, member.role)) {
      throw ApiError.forbidden("You cannot modify the role of a member with an equal or higher role");
    }

    if (!canManageRole(actorRole, newRole)) {
      throw ApiError.forbidden("You cannot assign a role equal to or higher than your own");
    }

    member.role = newRole;
    await project.save();
    req.app.locals.io?.to(`project:${project._id}`).emit(events.memberRoleChanged, { projectId: project._id.toString(), userId, role: newRole });

    res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      data: project,
    });
  }
);

export const leaveProject = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const project = req.projectMembership!.project;
    const userId = req.user!.id;

    if (project.owner.toString() === userId) {
      throw ApiError.badRequest("Owner cannot leave the project. Transfer ownership or delete the project.");
    }

    const memberIndex = project.members.findIndex((m) => m.user.toString() === userId);
    if (memberIndex === -1) {
      throw ApiError.badRequest("You are not a member of this project");
    }

    project.members.splice(memberIndex, 1);
    await project.save();

    const io = req.app.locals.io;
    if (io) {
      const { broadcastMemberRemoved } = await import("../sockets/task.socket.js");
      broadcastMemberRemoved(io, project._id.toString(), userId);
    }

    res.status(200).json({
      success: true,
      message: "You have left the project",
    });
  }
);
