import type { Task, Member } from "../types";
export function taskPermissions(task: Task, role: Member["role"] | undefined, userId: string | undefined, projectArchived = false) {
  const manager = role === "owner" || role === "admin";
  const writable = !projectArchived && !task.isArchived;
  return {
    edit: writable && manager,
    status: writable && (manager || (role === "member" && !!userId && task.assignee?._id === userId)),
    archive: writable && manager,
    restore: !projectArchived && task.isArchived && manager,
    comment: writable && !!role,
  };
}
