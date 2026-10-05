import { useState } from "react";
import { getErrorMessage } from "../utils/apiError";
import { Member } from "../types";

interface CreateTaskModalProps {
    projectId: string;
    projectMembers: Member[];
    onClose: () => void;
    onSubmit: (task: any) => void;
    isPending: boolean;
    isError: boolean;
    error: unknown;
}

const CreateTaskModal = ({
    projectId,
    projectMembers,
    onClose,
    onSubmit,
    isPending,
    isError,
    error,
}: CreateTaskModalProps) => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
    const [status, setStatus] = useState<"todo" | "in_progress" | "done">("todo");
    const [assignee, setAssignee] = useState("");
    const [dueDate, setDueDate] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            title,
            description: description || undefined,
            priority,
            status,
            assignee: assignee || undefined,
            dueDate: dueDate || undefined,
            projectId,
        });
    };

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div>
                            <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700 mb-1">
                                Task Title *
                            </label>
                            <input
                                id="taskTitle"
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="What needs to be done?"
                            />
                        </div>

                        <div>
                            <label htmlFor="taskDescription" className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <textarea
                                id="taskDescription"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Add more details..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="taskStatus" className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    id="taskStatus"
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="todo">To Do</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="done">Done</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="taskPriority" className="block text-sm font-medium text-gray-700 mb-1">
                                    Priority
                                </label>
                                <select
                                    id="taskPriority"
                                    value={priority}
                                    onChange={(e) => setPriority(e.target.value as any)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="taskAssignee" className="block text-sm font-medium text-gray-700 mb-1">
                                    Assignee
                                </label>
                                <select
                                    id="taskAssignee"
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

                            <div>
                                <label htmlFor="taskDueDate" className="block text-sm font-medium text-gray-700 mb-1">
                                    Due Date
                                </label>
                                <input
                                    id="taskDueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {isError && (
                        <div className="mt-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                            {getErrorMessage(error, "Failed to create task")}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                        >
                            {isPending ? "Creating..." : "Create Task"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTaskModal;
