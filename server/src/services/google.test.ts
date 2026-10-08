import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TokenPayload } from "google-auth-library";
import User from "../models/User.js";
import { resolveGoogleUser } from "./google.js";
vi.mock("../models/User.js", () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
const payload = { sub: "subject", email: "test@example.com", email_verified: true } as TokenPayload;
describe("Google identity resolution", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects unverified emails", async () => {
    await expect(resolveGoogleUser({ ...payload, email_verified: false })).rejects.toMatchObject({ statusCode: 401 });
    expect(User.findOne).not.toHaveBeenCalled();
  });
  it("uses the stable provider subject for an existing identity", async () => {
    const user = { _id: "existing" };
    vi.mocked(User.findOne).mockResolvedValueOnce(user as never);
    expect(await resolveGoogleUser(payload)).toBe(user);
    expect(User.findOne).toHaveBeenCalledWith({ googleId: "subject" });
  });
  it("does not silently link an email match", async () => {
    vi.mocked(User.findOne).mockResolvedValueOnce(null).mockResolvedValueOnce({ _id: "other" } as never);
    await expect(resolveGoogleUser(payload)).rejects.toMatchObject({ statusCode: 409 });
    expect(User.create).not.toHaveBeenCalled();
  });
  it("provisions missing names with profile completion and a bounded username", async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    await resolveGoogleUser(payload);
    expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ firstName: "New", lastName: "User", needsProfileCompletion: true, username: expect.stringMatching(/^user_[a-f0-9]{14}$/) }));
  });
  it("retries a generated username collision", async () => {
    vi.mocked(User.findOne).mockResolvedValue(null);
    vi.mocked(User.create).mockRejectedValueOnce({ code: 11000 }).mockResolvedValueOnce({ _id: "created" } as never);
    expect(await resolveGoogleUser({ ...payload, given_name: "A", family_name: "B" })).toEqual({ _id: "created" });
    expect(User.create).toHaveBeenCalledTimes(2);
  });
});
