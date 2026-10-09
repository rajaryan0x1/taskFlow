import { expect, it, vi } from "vitest";
import type { Server } from "socket.io";
import { evictUserFromProject, broadcastTaskDelete } from "./task.socket.js";
import { events } from "@taskflow/contracts";
it("removes every device from the project before notifying its UI", async () => {
  const sockets = [0, 1].map(() => ({ leave: vi.fn().mockResolvedValue(undefined), emit: vi.fn() }));
  const io = { in: vi.fn(() => ({ fetchSockets: async () => sockets })) };
  await evictUserFromProject(io as unknown as Server, "project", "user");
  expect(io.in).toHaveBeenCalledWith("user:user");
  for (const socket of sockets) {
    expect(socket.leave).toHaveBeenCalledWith("project:project");
    expect(socket.emit).toHaveBeenCalledWith(events.projectEvicted, { projectId: "project" });
    expect(socket.leave.mock.invocationCallOrder[0]).toBeLessThan(socket.emit.mock.invocationCallOrder[0]!);
  }
});
it("scopes deletion events to the authorized project room", () => {
  const emit = vi.fn();
  const io = { to: vi.fn(() => ({ emit })) };
  broadcastTaskDelete(io as unknown as Server, "project-a", "task-a");
  expect(io.to).toHaveBeenCalledWith("project:project-a");
  expect(emit).toHaveBeenCalledWith(events.taskDeleted, { taskId: "task-a" });
});
