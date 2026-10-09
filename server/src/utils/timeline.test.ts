import { expect, it } from "vitest";
import { utcTimelineWindow } from "./timeline.js";
it("returns exactly 30 UTC dates across month and year boundaries", () => {
  const window = utcTimelineWindow(new Date("2026-01-01T00:15:00Z"));
  expect(window.days).toHaveLength(30);
  expect(window.days[0]!.date).toBe("2025-12-03");
  expect(window.days.at(-1)!.date).toBe("2026-01-01");
  expect(window.end.toISOString()).toBe("2026-01-02T00:00:00.000Z");
});
