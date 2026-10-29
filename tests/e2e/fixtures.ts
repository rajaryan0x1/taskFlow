import { test as base, expect } from "@playwright/test";

// Keep production rate limits intact while giving each test a fresh budget.
export const test = base.extend<{ rateLimitBudget: void }>({
  rateLimitBudget: [async ({ request }, use) => {
    const response = await request.post("http://127.0.0.1:5100/__test/reset-rate-limits");
    expect(response.status()).toBe(204);
    await use();
  }, { auto: true }],
});
export { expect };
