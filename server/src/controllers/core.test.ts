import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import User from "../models/User.js";
import { getMe } from "./auth.controller.js";
import { inviteMember } from "./project.controller.js";
import { createTask } from "./task.controller.js";
import { ProjectRole } from "../types/roles.js";

vi.mock("../models/User.js", () => ({ default: { findById: vi.fn() } }));
const id = new Types.ObjectId();
function response() { const res = { status: vi.fn(), json: vi.fn() }; res.status.mockReturnValue(res); return res; }

describe("identity and mutation boundaries", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a stable public identity after reload without credentials", async () => {
    vi.mocked(User.findById).mockResolvedValue({ _id: id, firstName: "Test", lastName: "User", username: "test", email: "test@example.com", appRole: "user", authProvider: "local", password: "secret", googleId: "provider-secret" } as never);
    const res = response();
    await getMe({ user: { id: id.toString() } } as Request, res as unknown as Response, vi.fn());
    const body = res.json.mock.calls[0]![0];
    expect(body.user.id).toBe(id.toString());
    expect(body.user).not.toHaveProperty("password");
    expect(body.user).not.toHaveProperty("googleId");
  });

  it("rejects equal-role invitations before looking up a target", async () => {
    const next = vi.fn();
    await inviteMember({ body: { userId: id.toString(), role: "admin" }, projectMembership: { role: ProjectRole.ADMIN, project: {} } } as Request, response() as unknown as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
    expect(User.findById).not.toHaveBeenCalled();
  });

  it.each([true, false])("rejects archived creation regardless of route parameters (%s)", async (nested) => {
    const next = vi.fn();
    await createTask({ body: { title: "New task", projectId: id.toString() }, params: nested ? { projectId: id.toString() } : {}, projectMembership: { project: { isArchived: true } } } as Request, response() as unknown as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
