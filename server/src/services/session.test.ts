import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { Session } from "../models/Session.js";
import User from "../models/User.js";
import { authenticateSession, cookieName, endSession, hashToken, sessionToken, startSession } from "./session.js";
import { requireTrustedOrigin } from "../middleware/origin.middleware.js";

vi.mock("../models/Session.js", () => ({ Session: { findOne: vi.fn(), create: vi.fn(), deleteOne: vi.fn(), deleteMany: vi.fn() } }));
vi.mock("../models/User.js", () => ({ default: { findById: vi.fn() } }));
const token = "a".repeat(64);
const cookie = `${cookieName}=${token}`;

describe("revocable cookie sessions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("ignores malformed and missing cookies", async () => {
    expect(sessionToken(`${cookieName}=short`)).toBeUndefined();
    await expect(authenticateSession(undefined)).rejects.toMatchObject({ statusCode: 401 });
    expect(Session.findOne).not.toHaveBeenCalled();
  });
  it("rejects revoked sessions and queries with an explicit expiry bound", async () => {
    vi.mocked(Session.findOne).mockResolvedValue(null);
    await expect(authenticateSession(cookie)).rejects.toMatchObject({ statusCode: 401 });
    expect(Session.findOne).toHaveBeenCalledWith({ tokenHash: hashToken(token), expiresAt: { $gt: expect.any(Date) } });
  });
  it("checks current account status instead of stale claims", async () => {
    vi.mocked(Session.findOne).mockResolvedValue({ user: "user-id", expiresAt: new Date() } as never);
    vi.mocked(User.findById).mockResolvedValue({ isDisabled: true } as never);
    await expect(authenticateSession(cookie)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("stores a digest, sends an HttpOnly cookie, and replaces the previous session", async () => {
    const disconnectSockets = vi.fn();
    const req = { headers: { cookie }, app: { locals: { io: { in: vi.fn(() => ({ disconnectSockets })) } } } } as unknown as Request;
    const res = { cookie: vi.fn() };
    await startSession(req, res as unknown as Response, "user-id", 3);
    const [, newToken, options] = res.cookie.mock.calls[0]!;
    expect(newToken).toMatch(/^[a-f0-9]{64}$/);
    expect(options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(Session.create).toHaveBeenCalledWith(expect.objectContaining({ tokenHash: hashToken(newToken), user: "user-id", authVersion: 3 }));
    expect(Session.deleteOne).toHaveBeenCalledWith({ tokenHash: hashToken(token) });
    expect(disconnectSockets).toHaveBeenCalledWith(true);
  });
  it("rejects a session inserted after revocation with an older credential version", async () => {
    vi.mocked(Session.findOne).mockResolvedValue({ user: "user-id", authVersion: 2, expiresAt: new Date() } as never);
    vi.mocked(User.findById).mockResolvedValue({ isDisabled: false, authVersion: 3 } as never);
    await expect(authenticateSession(cookie)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("keeps legacy sessions valid until the account credentials change", async () => {
    vi.mocked(Session.findOne).mockResolvedValue({ user: "user-id", expiresAt: new Date() } as never);
    vi.mocked(User.findById).mockResolvedValue({ isDisabled: false } as never);
    await expect(authenticateSession(cookie)).resolves.toMatchObject({ tokenHash: hashToken(token) });
    vi.mocked(User.findById).mockResolvedValue({ isDisabled: false, authVersion: 1 } as never);
    await expect(authenticateSession(cookie)).rejects.toMatchObject({ statusCode: 401 });
  });
  it("revokes all sessions and disconnects all user sockets", async () => {
    const disconnectSockets = vi.fn();
    const req = { headers: { cookie }, user: { id: "user-id" }, app: { locals: { io: { in: vi.fn(() => ({ disconnectSockets })) } } } } as unknown as Request;
    const res = { clearCookie: vi.fn() };
    await endSession(req, res as unknown as Response, true);
    expect(Session.deleteMany).toHaveBeenCalledWith({ user: "user-id" });
    expect(disconnectSockets).toHaveBeenCalledWith(true);
    expect(res.clearCookie).toHaveBeenCalled();
  });
  it.each([undefined, "https://attacker.example"])("rejects unsafe requests from %s", (origin) => {
    const next = vi.fn();
    requireTrustedOrigin({ method: "POST", headers: { origin }, get: () => "web" } as unknown as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
  it("requires the non-simple header even for the trusted origin", () => {
    const next = vi.fn();
    requireTrustedOrigin({ method: "POST", headers: { origin: "http://localhost:5173" }, get: () => undefined } as unknown as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
