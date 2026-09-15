import { describe, it, expect } from "vitest";
import { escapeRegex } from "./user.routes.js";

describe("user search escaping", () => {
  it("treats regex metacharacters as literal characters", () => {
    const pattern = new RegExp(escapeRegex("a(b"), "i");

    expect(pattern.test("a(b")).toBe(true);
    expect(pattern.test("axb")).toBe(false);
  });
});
