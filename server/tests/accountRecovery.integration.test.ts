import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import app from "../src/app.js";
import User from "../src/models/User.js";
import { Session } from "../src/models/Session.js";
import { requestAccountEmail } from "../src/services/accountEmail.js";
import { hashToken } from "../src/services/session.js";
import { sendEmail } from "../src/services/email.js";
vi.mock("../src/services/email.js", () => ({ sendEmail: vi.fn().mockResolvedValue(undefined), accountLink: (path: string, token: string) => `http://localhost:5173${path}#token=${token}` }));
let mongo: MongoMemoryServer;
let cookie: string;
const email = "recovery@example.com";
const password = "original-long-password";
const post = (path: string) => request(app).post(`/api/v1/auth/${path}`).set("Origin", "http://localhost:5173").set("X-TaskFlow-Client", "web");
function token(subject: string) {
  const message = vi.mocked(sendEmail).mock.calls.filter(call => call[1] === subject).at(-1)?.[2];
  expect(message).toBeTruthy();
  return message!.match(/#token=([a-f0-9]{64})/)![1]!;
}
beforeAll(async () => {
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: join(tmpdir(), "taskflow-test-mongodb") } });
  await mongoose.connect(mongo.getUri());
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}, 180000);
beforeEach(async () => {
  await User.deleteMany({}); await Session.deleteMany({});
  vi.mocked(sendEmail).mockReset().mockResolvedValue(undefined);
  const response = await post("register").send({ firstName: "Recovery", lastName: "Tester", username: "recovery", email, password }).expect(201);
  cookie = response.headers["set-cookie"][0].split(";")[0];
  await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(1));
});
afterAll(async () => { await mongoose.disconnect(); await mongo?.stop(); });

describe("Email ownership and password recovery", () => {
  it("stores only a token digest, verifies once, and does not create a session", async () => {
    const credential = token("Verify your TaskFlow email");
    const user = await User.findOne({ email }).select("+emailVerification");
    expect(user?.emailVerification?.digest).toBe(hashToken(credential));
    const me = await request(app).get("/api/v1/auth/me").set("Cookie", cookie).expect(200);
    expect(me.body.user.emailVerified).toBe(false);
    expect(me.body.user).not.toHaveProperty("emailVerification");
    const result = await post("verify-email").send({ token: credential }).expect(200);
    expect(result.headers["set-cookie"]).toBeUndefined();
    await post("verify-email").send({ token: credential }).expect(400);
    expect((await User.findOne({ email }))?.emailVerifiedAt).toBeTruthy();
  });
  it("rejects expired verification and reset links even before cleanup", async () => {
    const verification = token("Verify your TaskFlow email");
    await User.updateOne({ email }, { $set: { "emailVerification.expiresAt": new Date(0) } });
    await post("verify-email").send({ token: verification }).expect(400);
    await requestAccountEmail(email, "reset");
    const reset = token("Reset your TaskFlow password");
    await User.updateOne({ email }, { $set: { "passwordReset.expiresAt": new Date(0) } });
    await post("reset-password").send({ token: reset, password: "replacement-password" }).expect(400);
  });
  it("returns the same response for known and unknown addresses and throttles per account", async () => {
    const known = await post("forgot-password").send({ email }).expect(202);
    const unknown = await post("forgot-password").send({ email: "unknown@example.com" }).expect(202);
    expect(known.body).toEqual(unknown.body);
    await vi.waitFor(() => expect(sendEmail).toHaveBeenCalledTimes(2));
    await Promise.all([requestAccountEmail(email, "reset"), requestAccountEmail(email, "reset")]);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    await User.updateOne({ email }, { $set: { isDisabled: true } });
    await requestAccountEmail(email, "verification");
    expect(sendEmail).toHaveBeenCalledTimes(2);
  });
  it("consumes a reset atomically and rejects old passwords, sessions, and replay", async () => {
    await requestAccountEmail(email, "reset");
    const credential = token("Reset your TaskFlow password");
    const results = await Promise.all([0, 1].map(() => post("reset-password").send({ token: credential, password: "replacement-password" })));
    expect(results.map(result => result.status).sort()).toEqual([200, 400]);
    await request(app).get("/api/v1/auth/me").set("Cookie", cookie).expect(401);
    await post("login").send({ email, password }).expect(401);
    await post("login").send({ email, password: "replacement-password" }).expect(200);
    const user = await User.findOne({ email }).select("+passwordReset");
    expect(user?.authVersion).toBe(1);
    expect(user?.passwordReset).toBeUndefined();
    expect(user?.emailVerifiedAt).toBeTruthy();
  });
  it("invalidates outstanding reset links when an authenticated password changes", async () => {
    await requestAccountEmail(email, "reset");
    const credential = token("Reset your TaskFlow password");
    await post("password").set("Cookie", cookie).send({ currentPassword: password, newPassword: "new-confirmed-password" }).expect(200);
    await post("reset-password").send({ token: credential, password: "replacement-password" }).expect(400);
  });
  it("does not issue resets for Google-only users and invalidates failed deliveries", async () => {
    await User.create({ firstName: "Google", lastName: "Tester", username: "google_only", email: "google@example.com", authProvider: "google", googleId: "test-google-subject" });
    await requestAccountEmail("google@example.com", "reset");
    expect(sendEmail).toHaveBeenCalledTimes(1);
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("SMTP credential must never be returned"));
    await expect(requestAccountEmail(email, "reset")).rejects.toThrow("Account email delivery failed");
    const user = await User.findOne({ email }).select("+passwordReset");
    expect(user?.passwordReset?.digest).toBeUndefined();
    expect(user?.passwordReset?.issuedAt).toBeTruthy();
  });
});
