import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { queryKeys } from "./queryKeys";
it("invalidates every analytics view for a project without affecting another project", async () => {
  const client = new QueryClient();
  const keys = ["progress", "users", "timeline"].map(metric => [...queryKeys.analytics("a"), metric]);
  keys.forEach(key => client.setQueryData(key, {}));
  const unrelated = [...queryKeys.analytics("b"), "progress"];
  client.setQueryData(unrelated, {});
  await client.invalidateQueries({ queryKey: queryKeys.analytics("a") });
  keys.forEach(key => expect(client.getQueryState(key)?.isInvalidated).toBe(true));
  expect(client.getQueryState(unrelated)?.isInvalidated).toBe(false);
  client.clear();
});
