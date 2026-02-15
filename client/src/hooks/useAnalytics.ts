import { useQuery } from "@tanstack/react-query";
import api from "../api/axios";

// ─── Response Types ───────────────────────────────────────────────────────────

export interface ProgressData {
    totalTasks: number;
    tasksByStatus: {
        todo: number;
        in_progress: number;
        done: number;
    };
    completionRate: number;
    tasksByMember: Array<{
        user: { id: string; name: string };
        count: number;
    }>;
}

export interface UserPerformance {
    user: { id: string; name: string; email: string };
    tasksCreated: number;
    tasksCompleted: number;
    tasksInProgress: number;
    tasksTodo: number;
    completionRate: number;
}

export interface TimelineDay {
    date: string;
    created: number;
    completed: number;
}

export interface TimelineData {
    last30Days: TimelineDay[];
    overdueTasks: number;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export const useProjectProgress = (projectId: string | undefined) =>
    useQuery({
        queryKey: ["analytics", "progress", projectId],
        queryFn: async () => {
            const res = await api.get<{ data: ProgressData }>(
                `/projects/${projectId}/analytics/progress`
            );
            return res.data.data;
        },
        enabled: !!projectId,
    });

export const useUserPerformance = (projectId: string | undefined) =>
    useQuery({
        queryKey: ["analytics", "users", projectId],
        queryFn: async () => {
            const res = await api.get<{ data: { users: UserPerformance[] } }>(
                `/projects/${projectId}/analytics/users`
            );
            return res.data.data.users;
        },
        enabled: !!projectId,
    });

export const useTimeline = (projectId: string | undefined) =>
    useQuery({
        queryKey: ["analytics", "timeline", projectId],
        queryFn: async () => {
            const res = await api.get<{ data: TimelineData }>(
                `/projects/${projectId}/analytics/timeline`
            );
            return res.data.data;
        },
        enabled: !!projectId,
    });
