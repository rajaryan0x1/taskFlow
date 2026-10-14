import { beforeEach, describe, expect, it, vi } from "vitest";
const { verifyIdToken } = vi.hoisted(() => ({ verifyIdToken: vi.fn() }));
vi.mock("google-auth-library", () => ({ OAuth2Client: class { verifyIdToken = verifyIdToken; } }));
vi.mock("../config/env.js", () => ({ env: { GOOGLE_CLIENT_ID: "configured-client.apps.googleusercontent.com" } }));
import { verifiedGoogleIdentity } from "./google.js";

describe("Google ID-token verification", () => {
  beforeEach(() => vi.resetAllMocks());
  it("verifies the credential against the configured client audience", async () => {
    const identity = { sub: "google-subject", email: "google@example.com", email_verified: true };
    verifyIdToken.mockResolvedValue({ getPayload: () => identity });
    expect(await verifiedGoogleIdentity("id-token")).toEqual(identity);
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: "id-token", audience: "configured-client.apps.googleusercontent.com" });
  });
  it("maps Google verification failures to a controlled error without leaking details", async () => {
    verifyIdToken.mockRejectedValue(new Error("invalid audience or signature: sensitive-token"));
    await expect(verifiedGoogleIdentity("invalid-token")).rejects.toMatchObject({ statusCode: 401, message: "Unable to verify Google sign-in" });
  });
  it.each([undefined, { sub: "subject", email: "google@example.com", email_verified: false }, { email: "google@example.com", email_verified: true }, { sub: "subject", email_verified: true }])("rejects incomplete or unverified identities", async identity => {
    verifyIdToken.mockResolvedValue({ getPayload: () => identity });
    await expect(verifiedGoogleIdentity("id-token")).rejects.toMatchObject({ statusCode: 401 });
  });
});
