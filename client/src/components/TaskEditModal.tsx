import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { queryClient } from "../api/queryClient";

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

const TaskEditModal = ({ task, projectId, projectMembers, onClose }: TaskEditModalProps) => {
    const [title, setTitle] = useState(task.title);
    const [description, setDescription] = useState(task.description || "");
    const [status, setStatus] = useState(task.status);
    const [priority, setPriority] = useState(task.priority);
    const [assignee, setAssignee] = useState(task.assignee?._id || "");

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateTaskMutation.mutate({
            title,
            description: description || undefined,
            status,
            priority,
            assignee: assignee || undefined,
        });
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

                <form onSubmit={handleSubmit}>
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
                                onChange={(e) => setTitle(e.target.value)}
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
                                onChange={(e) => setDescription(e.target.value)}
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
                                onChange={(e) => setStatus(e.target.value as "todo" | "in_progress" | "done")}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="todo">To Do</option>
                                <option value="in_progress">In Progress</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="editPriority" className="block text-sm font-medium text-gray-700 mb-1">
                                Priority
                            </label>
                            <select
                                id="editPriority"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
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
                                onChange={(e) => setAssignee(e.target.value)}
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

                    {updateTaskMutation.isError && (
                        <div className="mt-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                            Failed to update task. Please try again.
                        </div>
                    )}

                    <div className="mt-6 flex justify-between">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleteTaskMutation.isPending}
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
                                type="submit"
                                disabled={updateTaskMutation.isPending}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                            >
                                {updateTaskMutation.isPending ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskEditModal;