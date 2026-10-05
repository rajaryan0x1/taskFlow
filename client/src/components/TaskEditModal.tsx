import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "../api/axios";
import { getErrorMessage } from "../utils/apiError";
import { queryClient } from "../api/queryClient";
import { useAuthStore } from "../stores/authStore";
import { getSocket } from "../socket/socket";

interface Task {
    _id: string;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
    assignee?: {
        _id: string;
        firstName: string;
        lastName: string;
    };
}

interface TaskEditModalProps {
    task: Task;
    projectId: string;
    currentUserRole?: "owner" | "admin" | "member";
    projectMembers: Array<{
        user: {
            _id: string;
            firstName: string;
            lastName: string;
            email: string;
        };
    }>;
    onClose: () => void;
}

interface Comment {
    _id: string;
    body: string;
    createdAt: string;
    author: { _id: string; firstName: string; lastName: string };
}

interface Activity {
    _id: string;
    type: "created" | "status_changed" | "assigned" | "commented";
    meta: { from?: string; to?: string; assignee?: string | null };
    createdAt: string;
    actor: { _id: string; firstName: string; lastName: string };
}

const TaskEditModal = ({ task, projectId, projectMembers, onClose, currentUserRole }: TaskEditModalProps) => {
    const user = useAuthStore((state) => state.user);
    const canEdit = currentUserRole === "owner" || currentUserRole === "admin" || (task.assignee && typeof task.assignee !== "string" && task.assignee._id === user?.id);
    const canDelete = currentUserRole === "owner" || currentUserRole === "admin";
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || "");
    const [status, setStatus] = useState(task.status);
    const [priority, setPriority] = useState(task.priority);
    const [assignee, setAssignee] = useState(task.assignee?._id || "");
    const [commentBody, setCommentBody] = useState("");

    const { data: comments = [] } = useQuery({
        queryKey: ["comments", task._id],
        queryFn: async () => {
            const response = await api.get<{ data: Comment[] }>(`/projects/${projectId}/tasks/${task._id}/comments`);
            return response.data.data;
        },
    });

    const { data: activity = [] } = useQuery({
        queryKey: ["activity", task._id],
        queryFn: async () => {
            const response = await api.get<{ data: Activity[] }>(`/projects/${projectId}/tasks/${task._id}/activity`);
            return response.data.data;
        },
    });

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
        socket.on("comment:created", refreshComments);
        socket.on("comment:deleted", refreshComments);
        socket.on("activity:created", refreshComments);
        return () => {
            socket.off("comment:created", refreshComments);
            socket.off("comment:deleted", refreshComments);
            socket.off("activity:created", refreshComments);
        };
    }, [task._id]);

    const updateTaskMutation = useMutation({
        mutationFn: async (data: {
            title?: string;
            description?: string;
            status?: string;
            priority?: string;
            assignee?: string;
        }) => {
            const response = await api.patch(`/projects/${projectId}/tasks/${task._id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
            onClose();
        },
    });

    const deleteTaskMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/projects/${projectId}/tasks/${task._id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
            onClose();
        },
    });

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const updates: any = {};
        if (title !== task.title) updates.title = title;
        if (description !== (task.description || "")) updates.description = description || null;
        if (status !== task.status) updates.status = status;
        if (priority !== task.priority) updates.priority = priority;
        const currentAssignee = task.assignee ? (typeof task.assignee === 'string' ? task.assignee : task.assignee._id) : "";
        if (assignee !== currentAssignee) updates.assignee = assignee || null;
        const oldDueDate = task.dueDate ? task.dueDate.split('T')[0] : "";
        if (dueDate !== oldDueDate) updates.dueDate = dueDate || null;

        if (Object.keys(updates).length > 0) {
            updateTaskMutation.mutate(updates);
        } else {
            onClose(); // No changes to save
        }
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this task?")) {
            deleteTaskMutation.mutate();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Edit Task</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-4 mt-4">
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="editTitle" className="block text-sm font-medium text-gray-700 mb-1">
                                Title
                            </label>
                            <input
                                id="editTitle"
                                type="text"
                                required
                                value={title}
                                disabled={!canEdit} onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="editDescription" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="editDescription"
                                value={description}
                                disabled={!canEdit} onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="editStatus" className="block text-sm font-medium text-gray-700 mb-1">
                                Status
                            </label>
                            <select
                                id="editStatus"
                                value={status}
                                disabled={!canEdit} onChange={(e) => setStatus(e.target.value as "todo" | "in_progress" | "done")}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="editDueDate" className="block text-sm font-medium text-gray-700 mb-1">
                                Due Date
                            </label>
                            <input
                                id="editDueDate"
                                type="date"
                                value={dueDate}
                                disabled={!canEdit} onChange={(e) => setDueDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label htmlFor="editPriority" className="block text-sm font-medium text-gray-700 mb-1">
                                Priority
                            </label>
                            <select
                                id="editPriority"
                                value={priority}
                                disabled={!canEdit} onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="editAssignee" className="block text-sm font-medium text-gray-700 mb-1">
                                Assignee
                            </label>
                            <select
                                id="editAssignee"
                                value={assignee}
                                disabled={!canEdit} onChange={(e) => setAssignee(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

                    <section className="mt-6 border-t border-gray-200 pt-5">
                        <h4 className="text-sm font-semibold text-gray-900">Comments</h4>
                        <div className="mt-3 max-h-48 space-y-3 overflow-y-auto">
                            {comments.length === 0 && <p className="text-sm text-gray-500">No comments yet.</p>}
                            {comments.map((comment) => (
                                <div key={comment._id} className="rounded-md bg-gray-50 p-3">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span className="font-medium text-gray-700">{comment.author.firstName} {comment.author.lastName}</span>
                                        <button
                                            type="button"
                                            onClick={() => deleteCommentMutation.mutate(comment._id)}
                                            style={{ display: (currentUserRole === "owner" || currentUserRole === "admin" || comment.author._id === user?.id) ? "block" : "none" }}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">{comment.body}</p>
                                </div>
                            ))}
                        </div>
                        <form
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
                                placeholder="Add a comment"
                                className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                            />
                            <button
                                type="submit"
                                disabled={addCommentMutation.isPending || !commentBody.trim()}
                                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                            >
                                Add
                            </button>
                        </form>
                    </section>

                    <section className="mt-6 border-t border-gray-200 pt-5">
                        <h4 className="text-sm font-semibold text-gray-900">Activity</h4>
                        <div className="mt-3 space-y-2">
                            {activity.length === 0 && <p className="text-sm text-gray-500">No activity yet.</p>}
                            {activity.map((entry) => (
                                <div key={entry._id} className="text-sm text-gray-600">
                                    <span className="font-medium text-gray-800">
                                        {entry.actor.firstName} {entry.actor.lastName}
                                    </span>{" "}
                                    {entry.type === "status_changed"
                                        ? `changed status from ${entry.meta.from} to ${entry.meta.to}`
                                        : entry.type === "assigned"
                                            ? entry.meta.assignee ? "assigned the task" : "unassigned the task"
                                            : entry.type === "commented" ? "commented on the task" : "created the task"}
                                    <span className="ml-2 text-xs text-gray-400">
                                        {new Date(entry.createdAt).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {updateTaskMutation.isError && (
                        <div className="mt-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                            {getErrorMessage(updateTaskMutation.error, "Failed to update task")}
                        </div>
                    )}

                    <div className="mt-6 flex justify-between">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleteTaskMutation.isPending || !canDelete}
                            style={{ display: canDelete ? "block" : "none" }}
                            className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-300 rounded-md disabled:opacity-50"
                        >
                            {deleteTaskMutation.isPending ? "Deleting..." : "Delete Task"}
                        </button>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={updateTaskMutation.isPending || !canEdit}
                                style={{ display: canEdit ? "block" : "none" }}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                            >
                                {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskEditModal;