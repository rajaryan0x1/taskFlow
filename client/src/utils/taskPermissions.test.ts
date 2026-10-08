import { expect, it } from "vitest";
import { taskPermissions } from "./taskPermissions";
import type { Task } from "../types";
const task = { isArchived: false, assignee: { _id: "member" } } as Task;
it("allows assigned members to change status but not other fields", () => {
  expect(taskPermissions(task, "member", "member")).toMatchObject({ edit: false, status: true, archive: false });
  expect(taskPermissions(task, "member", "other").status).toBe(false);
});
it("makes archived projects and tasks read-only", () => {
  expect(taskPermissions(task, "owner", "owner", true)).toEqual({ edit: false, status: false, archive: false, restore: false, comment: false });
  expect(taskPermissions({ ...task, isArchived: true }, "admin", "admin")).toEqual({ edit: false, status: false, archive: false, restore: true, comment: false });
});
