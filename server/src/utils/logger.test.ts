import { describe, expect, it } from "vitest";
import { safeError } from "./logger.js";

describe("safeError", () => {
  it("excludes secrets from messages, names, custom stacks, and causes", () => {
    const error = new Error("password=secret\nsecond secret", { cause: "token=secret" });
    error.name = "credential=secret";
    error.stack = "    at token=secret";
    expect(safeError(error)).toEqual({ errorType: "Error" });
  });
  it("does not serialize arbitrary thrown values", () => {
    expect(safeError({ password: "secret" })).toEqual({ errorType: "UnknownError" });
  });
});
