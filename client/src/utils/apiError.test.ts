import { describe, expect, it } from "vitest";
import { getErrorMessage, getFieldErrors } from "./apiError";
const apiError = (data: unknown) => ({ isAxiosError: true, response: { data } });
describe("API validation feedback", () => {
  it("shows field details instead of a generic validation failure", () => {
    const error = apiError({ message: "Validation failed", errors: { username: ["Use letters, numbers, and underscores"], firstName: ["Enter your first name"] } });
    expect(getErrorMessage(error)).toBe("Username: Use letters, numbers, and underscores; First Name: Enter your first name");
    expect(getFieldErrors(error).username).toHaveLength(1);
  });
  it("handles malformed field envelopes and preserves useful API messages", () => {
    expect(getErrorMessage(apiError({ message: "Email already registered", errors: { email: [null, 2], password: "bad" } }))).toBe("Email already registered");
    expect(getFieldErrors(apiError({ errors: ["not a mapping"] }))).toEqual({});
    expect(getErrorMessage(apiError({ message: { nested: "bad" } }), "Please try again")).toBe("Please try again");
  });
  it("handles network and non-API errors", () => {
    expect(getErrorMessage(new Error("Network Error"))).toBe("Network Error");
    expect(getErrorMessage(null, "Please try again")).toBe("Please try again");
  });
});
