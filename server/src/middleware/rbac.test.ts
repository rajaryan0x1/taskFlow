import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { Project } from "../models/Project.js";
import { createProjectAccessMiddleware, requirePermission } from "./rbac.js";
import { ProjectRole } from "../types/roles.js";

vi.mock("../models/Project.js", () => ({ Project: { findById: vi.fn() } }));
const id = "507f1f77bcf86cd799439011";
const response = {} as Response;

describe("project authorization", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["user", "app_admin"])("denies non-members, including %s", async (role) => {
    vi.mocked(Project.findById).mockResolvedValue({ isArchived: false, getMemberRole: () => null } as never);
    const next = vi.fn();
    await createProjectAccessMiddleware()({ params: { projectId: id }, user: { id, role } } as Request, response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it("permits archived reads only through an explicit policy", async () => {
    vi.mocked(Project.findById).mockResolvedValue({ isArchived: true, getMemberRole: () => ProjectRole.OWNER } as never);
    const request = { params: { projectId: id }, user: { id, role: "user" } } as Request;
    const next = vi.fn();
    await createProjectAccessMiddleware()(request, response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    next.mockClear();
    await createProjectAccessMiddleware({ allowArchived: true })(request, response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it.each([ProjectRole.OWNER, ProjectRole.ADMIN, ProjectRole.MEMBER])("restricts project deletion for %s", (role) => {
    const next = vi.fn();
    requirePermission("PROJECT_DELETE")({ projectMembership: { role } } as Request, response, next);
    if (role === ProjectRole.OWNER) expect(next).toHaveBeenCalledWith();
    else expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
