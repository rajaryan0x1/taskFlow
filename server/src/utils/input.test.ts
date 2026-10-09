import { expect, it } from "vitest";
import { cursorSchema, dateInput, pageResult, parseInput } from "./input.js";
it.each(["0", "101", "1.5", "Infinity", ["5", "6"], {}])("rejects invalid page limit %j", limit => {
  expect(() => parseInput(cursorSchema, { limit })).toThrow();
});
it("validates real calendar dates and accepts clearing a date", () => {
  expect(dateInput.safeParse("2026-02-30").success).toBe(false);
  expect(dateInput.safeParse("2026-10-09").success).toBe(true);
  expect(dateInput.safeParse(null).success).toBe(true);
});
it("returns a next cursor only when the lookahead row exists", () => {
  const rows = [{ _id: "a" }, { _id: "b" }, { _id: "c" }];
  expect(pageResult(rows, 2)).toEqual({ data: rows.slice(0, 2), pagination: { nextCursor: "b" } });
  expect(pageResult(rows, 3).pagination.nextCursor).toBeNull();
});
