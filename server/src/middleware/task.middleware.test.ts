import { expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { Task } from "../models/Task.js";
import { loadTask, requireActiveTask } from "./task.middleware.js";
vi.mock("../models/Task.js", () => ({ Task: { findById: vi.fn() } }));
it("rejects a task addressed through another project", async () => {
  vi.mocked(Task.findById).mockResolvedValue({ project: "507f1f77bcf86cd799439011" } as never);
  const next = vi.fn();
  await loadTask({ params: { taskId: "507f1f77bcf86cd799439012", projectId: "507f1f77bcf86cd799439013" } } as unknown as Request, {} as Response, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
});
it("rejects ordinary writes to archived tasks", () => {
  const next = vi.fn();
  requireActiveTask({ task: { isArchived: true } } as Request, {} as Response, next);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
});
