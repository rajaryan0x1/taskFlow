import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { queryClient } from "../api/queryClient";
import { initSocket } from "../socket/socket";

interface Notification {
    _id: string;
    type: "task_assigned" | "comment_mention" | "due_soon" | "member_invited";
    payload: { taskTitle?: string; projectName?: string; projectId?: string; taskId?: string };
    read: boolean;
    createdAt: string;
}

interface NotificationResponse {
    data: Notification[];
    pagination: { unread: number };
}

const NotificationBell = () => {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);
    const { data } = useQuery({
        queryKey: ["notifications"],
        queryFn: async () => {
            const response = await api.get<NotificationResponse>("/notifications?limit=20");
            return response.data;
        },
    });

    useEffect(() => {
        let socket;
        try {
            socket = initSocket();
        } catch {
            return;
        }

        const refresh = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });
        socket.on("notification:new", refresh);
        return () => {
            socket.off("notification:new", refresh);
        };
    }, []);

    const markReadMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const markAllReadMutation = useMutation({
        mutationFn: () => api.patch("/notifications/read-all"),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
    });

    const describe = (notification: Notification) => {
        if (notification.type === "task_assigned") return `Assigned: ${notification.payload.taskTitle ?? "a task"}`;
        if (notification.type === "member_invited") return `Invited to ${notification.payload.projectName ?? "a project"}`;
        if (notification.type === "due_soon") return `Due soon: ${notification.payload.taskTitle ?? "a task"}`;
        return "You have a new notification";
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                type="button"
                aria-label="Notifications"
                onClick={() => setOpen((current) => !current)}
                className="relative rounded-md p-2 text-slate-300 hover:bg-white/5 hover:text-white"
            >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.5-2V10a6.5 6.5 0 0 0-13 0v5L4 17h5m6 0a3 3 0 0 1-6 0m6 0H9" />
                </svg>
                {(data?.pagination.unread ?? 0) > 0 && (
                    <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] font-bold text-white">
                        {data?.pagination.unread}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-white/10 bg-white/5 backdrop-blur-md border border-white/10 text-white p-3 shadow-lg">
                    <div className="mb-2 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-white">Notifications</h2>
                        <button
                            type="button"
                            onClick={() => markAllReadMutation.mutate()}
                            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                        >
                            Mark all read
                        </button>
                    </div>
                    <div className="max-h-72 space-y-1 overflow-y-auto">
                        {(data?.data ?? []).map((notification) => (
                            <button
                                type="button"
                                key={notification._id}
                                onClick={() => {
                                    if (!notification.read) markReadMutation.mutate(notification._id);
                                    if (notification.payload.projectId) {
                                        navigate(`/projects/${notification.payload.projectId}`);
                                        setOpen(false);
                                    }
                                }}
                                className={`block w-full rounded-md p-2 text-left text-sm ${notification.read ? "text-slate-400" : "bg-blue-900/20 text-white"}`}
                            >
                                <span>{describe(notification)}</span>
                                <span className="mt-1 block text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</span>
                            </button>
                        ))}
                        {data?.data.length === 0 && <p className="p-2 text-sm text-slate-400">No notifications.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
