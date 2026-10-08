import { beforeEach, expect, it, vi } from "vitest";
import { queryClient } from "../api/queryClient";
import { useAuthStore } from "./authStore";
import { disconnectSocket } from "../socket/socket";
vi.mock("../socket/socket", () => ({ disconnectSocket: vi.fn() }));
const alice = { id: "alice", firstName: "Alice", lastName: "User", username: "alice", email: "alice@example.com", appRole: "user" as const };
beforeEach(() => { useAuthStore.getState().logout(); vi.clearAllMocks(); });
it("clears private data and disconnects on account replacement", () => {
  useAuthStore.getState().setAuth(alice);
  queryClient.setQueryData(["notifications"], ["private"]);
  useAuthStore.getState().setAuth({ ...alice, id: "bob" });
  expect(queryClient.getQueryData(["notifications"])).toBeUndefined();
  expect(disconnectSocket).toHaveBeenCalled();
});
it("cancels an old request so its completion cannot repopulate the cache", async () => {
  useAuthStore.getState().setAuth(alice);
  let complete!: (data: string[]) => void;
  const pending = queryClient.fetchQuery({ queryKey: ["projects"], queryFn: () => new Promise<string[]>(resolve => { complete = resolve; }) }).catch(() => undefined);
  useAuthStore.getState().logout();
  useAuthStore.getState().setAuth({ ...alice, id: "bob" });
  complete(["alice's project"]);
  await pending;
  expect(queryClient.getQueryData(["projects"])).toBeUndefined();
});
it("keeps the cache when refreshing the same user's profile", () => {
  useAuthStore.getState().setAuth(alice);
  queryClient.setQueryData(["projects"], ["mine"]);
  useAuthStore.getState().setAuth({ ...alice, firstName: "Updated" });
  expect(queryClient.getQueryData(["projects"])).toEqual(["mine"]);
});
