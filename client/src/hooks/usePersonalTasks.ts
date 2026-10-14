import { useInfiniteQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { nextCursor, type Page } from "../api/pagination";
interface PersonalTask { _id: string; title: string; project: string; projectName: string; status: string; priority: string; dueDate?: string }
export function usePersonalTasks(limit = 6) {
  return useInfiniteQuery({
    queryKey: ["personal-tasks", limit],
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor<PersonalTask>,
    queryFn: async ({ pageParam, signal }) => (await api.get<Page<PersonalTask> & { summary: { total: number; overdue: number } }>("/tasks/mine", { signal, params: { limit, cursor: pageParam } })).data,
    refetchInterval: 60000,
  });
}
