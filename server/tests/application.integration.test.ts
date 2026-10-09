import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
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
    await api("member", "patch", path).send({ title: "Forbidden" }).expect(403);
    await api("member", "patch", path).send({ status: "done" }).expect(200);
    await api("owner", "patch", path).send({ description: "" }).expect(200);
    await api("owner", "delete", path).expect(200);
    await api("member", "patch", path).send({ status: "todo" }).expect(403);
    await api("owner", "post", `${path}/comments`).send({ body: "No writes" }).expect(403);
    await api("owner", "post", `${path}/restore`).expect(200);
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
    await api("owner", "patch", `/projects/${id}/tasks/${result.body.data._id}/assign`).send({ assignee: users.member!.id }).expect(200);
    expect((await assigned).assignee._id).toBe(users.member!.id);
    const removed = event(member, events.projectEvicted);
    await api("owner", "delete", `/projects/${id}/members/${users.member!.id}`).expect(200);
    expect(await removed).toEqual({ projectId: id });
    const denied = event(member, "error");
    member.emit(events.projectJoin, id);
    expect((await denied).message).toContain("Not authorized");
    owner.disconnect(); member.disconnect();
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
});
