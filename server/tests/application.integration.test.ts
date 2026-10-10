import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { io as connectSocket, type Socket } from "socket.io-client";
import app from "../src/app.js";
import { initializeSocket } from "../src/sockets/task.socket.js";
import { Project } from "../src/models/Project.js";
import { Task } from "../src/models/Task.js";
import { Session } from "../src/models/Session.js";
import User from "../src/models/User.js";
import { hashToken, cookieName } from "../src/services/session.js";
import { events } from "@taskflow/contracts";

let mongo: MongoMemoryServer;
let server: Server;
let baseUrl: string;
const sockets: Socket[] = [];
const users: Record<string, { id: string; cookie: string }> = {};
const origin = "http://localhost:5173";
function api(role: string, method: "get" | "post" | "patch" | "delete", path: string) {
  return request(server)[method](`/api/v1${path}`).set("Cookie", users[role]!.cookie).set("Origin", origin).set("X-TaskFlow-Client", "web");
}
async function createProject() {
  const result = await api("owner", "post", "/projects").send({ name: "Integration project" }).expect(201);
  return result.body.data._id as string;
}
async function invite(projectId: string, user: string, role = "member") {
  await api("owner", "post", `/projects/${projectId}/members`).send({ userId: users[user]!.id, role }).expect(200);
}
function event(socket: Socket, name: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off(name, listener); reject(new Error(`Timed out waiting for ${name}`)); }, 5000);
    function listener(payload: unknown) { clearTimeout(timeout); resolve(payload); }
    socket.once(name, listener);
  });
}
async function socketFor(role: string) {
  const socket = connectSocket(baseUrl, { autoConnect: false, transports: ["websocket"], extraHeaders: { Cookie: users[role]!.cookie, Origin: origin } });
  sockets.push(socket);
  const connected = event(socket, "connect");
  socket.connect();
  await connected;
  return socket;
}

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: join(tmpdir(), "taskflow-test-mongodb") } });
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
  server = createServer(app);
  app.locals.io = initializeSocket(server);
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  for (const name of ["owner", "admin", "member", "outsider"]) {
    const result = await request(server).post("/api/v1/auth/register").set("Origin", origin).set("X-TaskFlow-Client", "web").send({ firstName: name, lastName: "Tester", username: name, email: `${name}@example.com`, password: "correct-horse-battery" }).expect(201);
    users[name] = { id: result.body.user.id, cookie: result.headers["set-cookie"][0].split(";")[0] };
    expect(result.body).not.toHaveProperty("token");
  }
}, 180000);
beforeEach(async () => { await Project.deleteMany({}); await Task.deleteMany({}); });
afterAll(async () => {
  sockets.forEach(socket => socket.disconnect());
  if (app.locals.io) await new Promise<void>(resolve => app.locals.io.close(resolve));
  if (server?.listening) await new Promise<void>(resolve => server.close(() => resolve()));
  await mongoose.disconnect();
  await mongo?.stop();
});

describe("HTTP and real-time project boundaries", () => {
  it("exposes health and generated request IDs without framework headers", async () => {
    const live = await request(server).get("/health/live").set("X-Request-ID", "untrusted").expect(200);
    expect(live.body.status).toBe("ok");
    expect(live.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(live.headers).not.toHaveProperty("x-powered-by");
    const ready = await request(server).get("/health/ready").expect(200);
    expect(ready.body.db).toBe("connected");
    const me = await api("owner", "get", "/auth/me").expect(200);
    expect(me.headers["cache-control"]).toBe("no-store");
  });
  it("restores the public identity and rejects a missing origin on mutation", async () => {
    const me = await api("owner", "get", "/auth/me").expect(200);
    expect(me.body.user.id).toBe(users.owner!.id);
    expect(me.body.user).not.toHaveProperty("password");
    await request(server).post("/api/v1/projects").set("Cookie", users.owner!.cookie).send({ name: "forbidden" }).expect(403);
  });
  it("enforces hierarchy on invitations and the role route", async () => {
    const id = await createProject();
    await invite(id, "admin", "admin");
    await api("admin", "post", `/projects/${id}/members`).send({ userId: users.member!.id, role: "admin" }).expect(403);
    await invite(id, "member");
    await api("owner", "patch", `/projects/${id}/members/${users.member!.id}/role`).send({ role: "admin" }).expect(200);
    await api("outsider", "get", `/projects/${id}`).expect(403);
  });
  it("allows archived reads and rejects creation through both URLs", async () => {
    const id = await createProject();
    await api("owner", "delete", `/projects/${id}`).expect(200);
    await api("owner", "get", `/projects/${id}`).expect(200);
    await api("owner", "get", `/projects/${id}/tasks`).expect(200);
    await api("owner", "post", `/projects/${id}/tasks`).send({ title: "Should fail" }).expect(403);
    await api("owner", "post", "/tasks").send({ title: "Should also fail", projectId: id }).expect(403);
    await api("owner", "post", `/projects/${id}/restore`).expect(200);
    await api("owner", "post", `/projects/${id}/tasks`).send({ title: "Allowed now" }).expect(201);
  });
  it("archives/restores tasks and restricts members to status changes", async () => {
    const id = await createProject();
    await invite(id, "member");
    const result = await api("owner", "post", `/projects/${id}/tasks`).send({ title: "Test task", assignee: users.member!.id }).expect(201);
    const path = `/projects/${id}/tasks/${result.body.data._id}`;
    await api("member", "patch", path).set("If-Match", '"0"').send({ title: "Forbidden" }).expect(403);
    await api("member", "patch", path).set("If-Match", '"0"').send({ status: "done" }).expect(200);
    await api("owner", "patch", path).set("If-Match", '"1"').send({ description: "" }).expect(200);
    await api("owner", "delete", path).set("If-Match", '"2"').expect(200);
    await api("member", "patch", path).send({ status: "todo" }).expect(403);
    await api("owner", "post", `${path}/comments`).send({ body: "No writes" }).expect(403);
    await api("owner", "post", `${path}/restore`).set("If-Match", '"3"').expect(200);
    await api("owner", "get", path).expect(200);
  });
  it("denies mismatched task/project IDs", async () => {
    const id = await createProject();
    const other = await createProject();
    const result = await api("owner", "post", `/projects/${id}/tasks`).send({ title: "Private task" }).expect(201);
    await api("owner", "get", `/projects/${other}/tasks/${result.body.data._id}`).expect(403);
  });
  it("broadcasts updates to two clients and evicts removed members", async () => {
    const id = await createProject();
    await invite(id, "member");
    const owner = await socketFor("owner");
    const member = await socketFor("member");
    for (const socket of [owner, member]) { const joined = event(socket, events.projectJoined); socket.emit(events.projectJoin, id); await joined; }
    const created = event(member, events.taskCreated);
    const result = await api("owner", "post", `/projects/${id}/tasks`).send({ title: "Broadcast task" }).expect(201);
    expect((await created)._id).toBe(result.body.data._id);
    const assigned = event(member, events.taskUpdated);
    await api("owner", "patch", `/projects/${id}/tasks/${result.body.data._id}/assign`).set("If-Match", '"0"').send({ assignee: users.member!.id }).expect(200);
    expect((await assigned).assignee._id).toBe(users.member!.id);
    const removed = event(member, events.projectEvicted);
    await api("owner", "delete", `/projects/${id}/members/${users.member!.id}`).expect(200);
    expect(await removed).toEqual({ projectId: id });
    const denied = event(member, "error");
    member.emit(events.projectJoin, id);
    expect((await denied).message).toContain("Not authorized");
    owner.disconnect(); member.disconnect();
  });
  it("paginates without repeats and searches tasks beyond the first page", async () => {
    const id = await createProject();
    await Task.insertMany(Array.from({ length: 7 }, (_, index) => ({ title: `Task ${index}`, project: id, createdBy: users.owner!.id })));
    const first = await api("owner", "get", `/projects/${id}/tasks?limit=3`).expect(200);
    const second = await api("owner", "get", `/projects/${id}/tasks?limit=3&cursor=${first.body.pagination.nextCursor}`).expect(200);
    expect(first.body.data).toHaveLength(3);
    expect(second.body.data).toHaveLength(3);
    const ids = [...first.body.data, ...second.body.data].map(task => task._id);
    expect(new Set(ids).size).toBe(6);
    const searched = await api("owner", "get", `/projects/${id}/tasks?q=Task%200`).expect(200);
    expect(searched.body.data).toHaveLength(1);
    await api("owner", "get", `/projects/${id}/tasks?limit=Infinity`).expect(400);
    await api("owner", "get", `/projects/${id}/tasks?status=unknown`).expect(400);
    await api("owner", "post", `/projects/${id}/tasks`).send({ title: "Invalid date", dueDate: "2026-02-30" }).expect(400);
    await api("owner", "get", "/notifications?page=1.5").expect(400);
    await api("owner", "get", "/users/search?q=a&q=b").expect(400);
  });
  it("rejects stale saves instead of overwriting a collaborator", async () => {
    const id = await createProject();
    const result = await api("owner", "post", `/projects/${id}/tasks`).send({ title: "Original" }).expect(201);
    const path = `/projects/${id}/tasks/${result.body.data._id}`;
    await api("owner", "patch", path).send({ title: "No version" }).expect(428);
    await api("owner", "patch", path).set("If-Match", '"0"').send({ title: "First update" }).expect(200);
    await api("owner", "patch", path).set("If-Match", '"0"').send({ title: "Stale update" }).expect(409);
    const current = await api("owner", "get", path).expect(200);
    expect(current.body.data.title).toBe("First update");
  });
  it("keeps completion history after reopening and archiving", async () => {
    const id = await createProject();
    const result = await api("owner", "post", `/projects/${id}/tasks`).send({ title: "Historical task", status: "done" }).expect(201);
    const path = `/projects/${id}/tasks/${result.body.data._id}`;
    await api("owner", "patch", path).set("If-Match", '"0"').send({ status: "todo" }).expect(200);
    await api("owner", "patch", path).set("If-Match", '"1"').send({ status: "done" }).expect(200);
    await api("owner", "delete", path).set("If-Match", '"2"').expect(200);
    const timeline = await api("owner", "get", `/projects/${id}/analytics/timeline`).expect(200);
    expect(timeline.body.data.last30Days).toHaveLength(30);
    expect(timeline.body.data.last30Days.at(-1)).toMatchObject({ created: 1, completed: 2 });
    await api("owner", "post", `/projects/${id}/tasks`).send({ title: "Unassigned task" }).expect(201);
    const members = await api("owner", "get", `/projects/${id}/analytics/users`).expect(200);
    expect(members.body.data.users[0]).toMatchObject({ tasksAssigned: 1, user: { id: "unassigned" } });
    expect(typeof members.body.data.users[0].user.name).toBe("string");
  });
  it("rejects expired sessions even before TTL cleanup", async () => {
    const id = users.outsider!.id;
    await Session.updateMany({ user: id }, { expiresAt: new Date(Date.now() - 1000) });
    await api("outsider", "get", "/auth/me").expect(401);
  });
  it("revokes logout credentials and disconnects the socket", async () => {
    const socket = await socketFor("admin");
    const disconnected = event(socket, "disconnect");
    await api("admin", "post", "/auth/logout").expect(200);
    await disconnected;
    await api("admin", "get", "/auth/me").expect(401);
  });
  it("confirms the password, enforces policy, and revokes every old session and socket", async () => {
    const signIn = (password: string) => request(server).post("/api/v1/auth/login")
      .set("Origin", origin).set("X-TaskFlow-Client", "web").send({ email: "owner@example.com", password });
    const another = await signIn("correct-horse-battery").expect(200);
    const otherCookie = another.headers["set-cookie"][0].split(";")[0];
    const socket = await socketFor("owner");
    await api("owner", "post", "/auth/password").send({ currentPassword: "wrong", newPassword: "replacement-password" }).expect(403);
    await api("owner", "get", "/auth/me").expect(200);
    for (const newPassword of ["short", "😀".repeat(20), "correct-horse-battery"]) {
      await api("owner", "post", "/auth/password").send({ currentPassword: "correct-horse-battery", newPassword }).expect(400);
    }
    const disconnected = event(socket, "disconnect");
    const cleanup = vi.spyOn(Session, "deleteMany").mockRejectedValueOnce(new Error("Simulated cleanup outage"));
    try {
      const result = await api("owner", "post", "/auth/password").send({ currentPassword: "correct-horse-battery", newPassword: "replacement-password" }).expect(200);
      expect(result.headers["set-cookie"][0]).toContain(`${cookieName}=;`);
      expect(await Session.countDocuments({ user: users.owner!.id })).toBeGreaterThan(0);
    } finally { cleanup.mockRestore(); }
    await disconnected;
    await api("owner", "get", "/auth/me").expect(401);
    await request(server).get("/api/v1/auth/me").set("Cookie", otherCookie).expect(401);
    await signIn("correct-horse-battery").expect(401);
    const signedIn = await signIn("replacement-password").expect(200);
    expect(signedIn.body.user).not.toHaveProperty("authVersion");
    await request(server).post("/api/v1/auth/password")
      .set("Cookie", signedIn.headers["set-cookie"][0].split(";")[0])
      .set("Origin", origin).set("X-TaskFlow-Client", "web")
      .send({ currentPassword: "replacement-password", newPassword: "another-replacement" }).expect(429);
    const user = await User.findById(users.owner!.id);
    expect(user!.authVersion).toBe(1);
    // Simulate an old-credential login finishing after the revocation cleanup.
    const lateToken = "b".repeat(64);
    await Session.create({ user: users.owner!.id, tokenHash: hashToken(lateToken), authVersion: 0, expiresAt: new Date(Date.now() + 60000) });
    await request(server).get("/api/v1/auth/me").set("Cookie", `${cookieName}=${lateToken}`).expect(401);
  });
  it("allows only one concurrent password change to win", async () => {
    const responses = await Promise.all(["first-replacement", "second-replacement"].map(newPassword =>
      api("member", "post", "/auth/password").send({ currentPassword: "correct-horse-battery", newPassword })));
    expect(responses.filter(response => response.status === 200)).toHaveLength(1);
    expect([401, 403, 409]).toContain(responses.find(response => response.status !== 200)!.status);
    expect((await User.findById(users.member!.id))!.authVersion).toBe(1);
    expect(await Session.countDocuments({ user: users.member!.id })).toBe(0);
  });
});
