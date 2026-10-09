import { Modal } from "./Modal";
import { nextCursor, type Page } from "../api/pagination";
import { events } from "@taskflow/contracts";
import { useEffect, useState } from "react";
import { useMutation, useInfiniteQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { getErrorMessage } from "../utils/apiError";
import { queryClient } from "../api/queryClient";
import { useAuthStore } from "../stores/authStore";
import { getSocket } from "../socket/socket";
import { taskPermissions } from "../utils/taskPermissions";
import type { Task, Member, Activity, Comment, TaskUpdate } from "../types";

interface TaskEditModalProps {
    task: Task;
    projectId: string;
    currentUserRole?: "owner" | "admin" | "member";
    projectMembers: Member[];
    onClose: () => void;
    projectArchived?: boolean;
}

const TaskEditModal = ({ task, projectId, projectMembers, onClose, currentUserRole, projectArchived = false }: TaskEditModalProps) => {
    const [openedVersion] = useState(task.__v);
    const versionConfig = { headers: { "If-Match": `"${openedVersion}"` } };
    const user = useAuthStore((state) => state.user);
    const permissions = taskPermissions(task, currentUserRole, user?.id, projectArchived);
    const canEdit = permissions.edit;
    const canStatus = permissions.status;
    const canDelete = permissions.archive;
    const [title, setTitle] = useState(task.title);
    const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split("T")[0] : "");
    const [description, setDescription] = useState(task.description || "");
    const [status, setStatus] = useState(task.status);
    const [priority, setPriority] = useState(task.priority);
    const [assignee, setAssignee] = useState(task.assignee?._id || "");
    const [commentBody, setCommentBody] = useState("");

    const commentsQuery = useInfiniteQuery({
        queryKey: ["comments", task._id],
        initialPageParam: undefined as string | undefined,
        getNextPageParam: nextCursor<Comment>,
        queryFn: async ({ pageParam, signal }) => {
            const response = await api.get<Page<Comment>>(`/projects/${projectId}/tasks/${task._id}/comments`, { signal, params: { cursor: pageParam } });
            return response.data;
        },
    });

    const activityQuery = useInfiniteQuery({
        queryKey: ["activity", task._id],
        initialPageParam: undefined as string | undefined,
        getNextPageParam: nextCursor<Activity>,
        queryFn: async ({ pageParam, signal }) => {
            const response = await api.get<Page<Activity>>(`/projects/${projectId}/tasks/${task._id}/activity`, { signal, params: { cursor: pageParam } });
            return response.data;
        },
    });

    const comments = commentsQuery.data?.pages.flatMap(page => page.data) ?? [];
    const activity = activityQuery.data?.pages.flatMap(page => page.data) ?? [];

    const addCommentMutation = useMutation({
        mutationFn: async (body: string) => {
            const response = await api.post(`/projects/${projectId}/tasks/${task._id}/comments`, { body });
            return response.data;
        },
        onSuccess: () => {
            setCommentBody("");
            queryClient.invalidateQueries({ queryKey: ["comments", task._id] });
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: async (commentId: string) => {
            await api.delete(`/projects/${projectId}/tasks/${task._id}/comments/${commentId}`);
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", task._id] }),
    });

    useEffect(() => {
        const socket = getSocket();
        if (!socket) return;
        const refreshComments = () => {
            queryClient.invalidateQueries({ queryKey: ["comments", task._id] });
            queryClient.invalidateQueries({ queryKey: ["activity", task._id] });
        };
        socket.on(events.commentCreated, refreshComments);
        socket.on(events.commentDeleted, refreshComments);
        socket.on(events.activityCreated, refreshComments);
        return () => {
            socket.off(events.commentCreated, refreshComments);
            socket.off(events.commentDeleted, refreshComments);
            socket.off(events.activityCreated, refreshComments);
        };
    }, [task._id]);

    const updateTaskMutation = useMutation({
        mutationFn: async (data: TaskUpdate) => {
            const response = await api.patch(`/projects/${projectId}/tasks/${task._id}`, data, versionConfig);
            return response.data;
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
                queryClient.invalidateQueries({ queryKey: ["task", projectId, task._id] }),
            ]);
            onClose();
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/projects/${projectId}/tasks/${task._id}`, versionConfig);
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }),
                queryClient.invalidateQueries({ queryKey: ["task", projectId, task._id] }),
            ]);
            onClose();
        },
    });

    const restore = useMutation({
        mutationFn: () => api.post(`/projects/${projectId}/tasks/${task._id}/restore`, {}, versionConfig),
        onSuccess: async () => { await Promise.all([queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }), queryClient.invalidateQueries({ queryKey: ["task", projectId, task._id] })]); onClose(); },
    });

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const updates: TaskUpdate = {};
        if (canEdit && title !== task.title) updates.title = title;
        if (canEdit && description !== (task.description || "")) updates.description = description;
        if (status !== task.status) updates.status = status;
        if (canEdit && priority !== task.priority) updates.priority = priority;
        const currentAssignee = task.assignee ? (typeof task.assignee === 'string' ? task.assignee : task.assignee._id) : "";
        if (canEdit && assignee !== currentAssignee) updates.assignee = assignee || null;
        const oldDueDate = task.dueDate ? task.dueDate.split('T')[0] : "";
        if (canEdit && dueDate !== oldDueDate) updates.dueDate = dueDate || null;

        if (Object.keys(updates).length > 0) {
            updateTaskMutation.mutate(updates);
        } else {
            onClose(); // No changes to save
        }
    };

    const handleDelete = () => {
        if (window.confirm("Archive this task? You can restore it later.")) {
            deleteTaskMutation.mutate();
        }
    };

    return (
        <Modal title="Task details" onClose={onClose}>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-white">Edit Task</h3>
                    <button
                        onClick={onClose}
                        aria-label="Close dialog"
                        className="text-slate-500 hover:text-slate-300"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4 mt-4">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="editTitle" className="block text-sm font-medium text-slate-200 mb-1">
                                Title
                            </label>
                            <input
                                id="editTitle"
                                type="text"
                                required
                                value={title}
                                disabled={!canEdit} onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="editDescription" className="block text-sm font-medium text-slate-200 mb-1">
                                Description
                            </label>
                            <textarea
                                id="editDescription"
                                value={description}
                                disabled={!canEdit} onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="editStatus" className="block text-sm font-medium text-slate-200 mb-1">
                                Status
                            </label>
                            <select
                                id="editStatus"
                                value={status}
                                disabled={!canStatus} onChange={(e) => setStatus(e.target.value as "todo" | "in_progress" | "done")}
                                className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="editDueDate" className="block text-sm font-medium text-slate-200 mb-1">
                                Due Date
                            </label>
                            <input
                                id="editDueDate"
                                type="date"
                                value={dueDate}
                                disabled={!canEdit} onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="editPriority" className="block text-sm font-medium text-slate-200 mb-1">
                                Priority
                            </label>
                            <select
                                id="editPriority"
                                value={priority}
                                disabled={!canEdit} onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                                className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="editAssignee" className="block text-sm font-medium text-slate-200 mb-1">
                                Assignee
                            </label>
                            <select
                                id="editAssignee"
                                value={assignee}
                                disabled={!canEdit} onChange={(e) => setAssignee(e.target.value)}
                                className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="">Unassigned</option>
                                {projectMembers.map((member) => (
                                    <option key={member.user._id} value={member.user._id}>
                                        {member.user.firstName} {member.user.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <section className="mt-6 border-t border-white/10 pt-5">
                        <h4 className="text-sm font-semibold text-white">Comments</h4>
                        <div className="mt-3 max-h-48 space-y-3 overflow-y-auto">
                            {comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
                            {comments.map((comment) => (
                                <div key={comment._id} className="rounded-md bg-transparent p-3">
                                    <div className="flex items-center justify-between text-xs text-slate-400">
                                        <span className="font-medium text-slate-200">{comment.author.firstName} {comment.author.lastName}</span>
                                        <button
                                            type="button"
                                            onClick={() => deleteCommentMutation.mutate(comment._id)}
                                            style={{ display: permissions.comment && (currentUserRole === "owner" || currentUserRole === "admin" || comment.author._id === user?.id) ? "block" : "none" }}
                                            className="text-red-600 hover:text-rose-300"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{comment.body}</p>
                                </div>
                            ))}
                        </div>
                        {commentsQuery.hasNextPage && <button disabled={commentsQuery.isFetchingNextPage} onClick={() => void commentsQuery.fetchNextPage()}>Older comments</button>}
                        {commentsQuery.isError && <p role="alert">{getErrorMessage(commentsQuery.error)}</p>}
                        {permissions.comment && <form
                            className="mt-3 flex gap-2"
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (commentBody.trim()) addCommentMutation.mutate(commentBody.trim());
                            }}
                        >
                            <input
                                value={commentBody}
                                onChange={(event) => setCommentBody(event.target.value)}
                                maxLength={2000}
                                aria-label="Comment"
                                placeholder="Add a comment"
                                className="min-w-0 flex-1 rounded-md border border-white/10 px-3 py-2 text-sm"
                            />
                            <button
                                type="submit"
                                disabled={addCommentMutation.isPending || !commentBody.trim()}
                                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                                Add
                            </button>
                        </form>}
                    </section>

                    <section className="mt-6 border-t border-white/10 pt-5">
                        <h4 className="text-sm font-semibold text-white">Activity</h4>
                        <div className="mt-3 space-y-2">
                            {activity.length === 0 && <p className="text-sm text-slate-400">No activity yet.</p>}
                            {activity.map((entry) => (
                                <div key={entry._id} className="text-sm text-slate-300">
                                    <span className="font-medium text-slate-200">
                                        {entry.actor.firstName} {entry.actor.lastName}
                                    </span>{" "}
                                    {entry.type === "status_changed"
                                        ? `changed status from ${entry.meta.from} to ${entry.meta.to}`
                                        : entry.type === "assigned"
                                            ? entry.meta.assignee ? "assigned the task" : "unassigned the task"
                                            : entry.type === "commented" ? "commented on the task" : "created the task"}
                                    <span className="ml-2 text-xs text-slate-500">
                                        {new Date(entry.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {activityQuery.hasNextPage && <button disabled={activityQuery.isFetchingNextPage} onClick={() => void activityQuery.fetchNextPage()}>Older activity</button>}
                    {activityQuery.isError && <p role="alert">{getErrorMessage(activityQuery.error)}</p>}
                    {updateTaskMutation.isError && (
                        <div className="mt-4 bg-rose-900/20 text-red-600 p-3 rounded text-sm">
                            {getErrorMessage(updateTaskMutation.error, "Failed to update task")}
                        </div>
                    )}

                    {[deleteTaskMutation.error, addCommentMutation.error, deleteCommentMutation.error, restore.error].filter(Boolean).map((error, index) => <p key={index} role="alert" className="text-rose-300">{getErrorMessage(error)}</p>)}
                    {permissions.restore && <button disabled={restore.isPending} onClick={() => restore.mutate()} className="rounded bg-indigo-600 px-4 py-2">Restore task</button>}
                    <div className="mt-6 flex justify-between">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleteTaskMutation.isPending || !canDelete}
                            style={{ display: canDelete ? "block" : "none" }}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-rose-900/20 border border-red-300 rounded-md disabled:opacity-50"
                        >
                            {deleteTaskMutation.isPending ? "Archiving..." : "Archive Task"}
                        </button>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-200 hover:bg-transparent border border-white/10 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={updateTaskMutation.isPending || !canStatus}
                                style={{ display: canStatus ? "block" : "none" }}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all rounded-md disabled:opacity-50"
                            >
                                {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default TaskEditModal;