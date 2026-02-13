import type { Request, Response } from "express";
import zod from "zod";
import { Project } from "../models/Project.js";
import User from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { ProjectRole } from "../types/roles.js";

//  Validation Schema 

const createProjectSchema = zod.object({
    name: zod.string().min(3).max(100),
    description: zod.string().min(10).max(500).optional()
})

const updateProjectSchema = zod.object({
    name: zod.string().min(3).max(100).optional(),
    description: zod.string().min(10).max(500).optional()
})


const inviteMemberSchema = zod.object({
    userId: zod.string().min(1, "User ID is required"),
    role: zod.enum([ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MEMBER]).default(ProjectRole.MEMBER)
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

    const includeArchived = req.query.archived === "true";
    const query: any = {
        "members.user": req.user!.id,
    };

    if (!includeArchived) {
        query.isArchived = false
    }

    const projects = await Project.find(query).populate("owner", "firstName  lastName email  username").populate("members.user", "firstName lastName email username").sort({ updatedAt: -1 });

    res.status(200).json({
        success: true,
        count: projects.length,
        data: projects
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
      res.status(200).json({
        success: true,
        message: "Project permanently deleted",
      });
    } else {
      // Soft delete — just archive it
      project.isArchived = true;
      await project.save();

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

    // Only owner can invite other owners
    if (role === ProjectRole.OWNER && req.projectMembership!.role !== ProjectRole.OWNER) {
      throw ApiError.forbidden("Only the owner can invite another owner");
    }

    // Add member
    project.members.push({
      user: userId as any,
      role,
      joinedAt: new Date(),
    });

    await project.save();

    // Re-fetch with populated data
    const updatedProject = await Project.findById(project._id)
      .populate("owner", "firstName lastName email username")
      .populate("members.user", "firstName lastName email username");

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
    const project = req.projectMembership!.project;

    // Can't remove the owner
    if (project.owner.toString() === userId) {
      throw ApiError.badRequest(
        "Cannot remove the owner. Transfer ownership first."
      );
    }

    // Find the member
    const memberIndex = project.members.findIndex(
      (m) => m.user.toString() === userId
    );

    if (memberIndex === -1) {
      throw ApiError.notFound("Member not found in this project");
    }

    // Remove member
    project.members.splice(memberIndex, 1);
    await project.save();

    res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: project,
    });
  }
);
