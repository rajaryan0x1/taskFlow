import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { queryClient } from "../api/queryClient";
import { initSocket, joinProject, leaveProject } from "../socket/socket";
import TaskEditModal from "../components/TaskEditModal";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import MembersPanel from "../components/MembersPanel";
import { useAuthStore } from "../stores/authStore";
import NotificationBell from "../components/NotificationBell";

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
    createdBy: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    project: {
        _id: string;
        name: string;
    };
    dueDate?: string;
    createdAt: string;
}

interface Project {
    _id: string;
    name: string;
    description?: string;
    members: Array<{
        user: {
            _id: string;
            firstName: string;
            lastName: string;
            email: string;
        };
        role: string;
    }>;
}

const ProjectPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [taskTitle, setTaskTitle] = useState("");
    const [taskDescription, setTaskDescription] = useState("");
    const [taskPriority, setTaskPriority] = useState<"low" | "medium" | "high">("medium");
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [activeTab, setActiveTab] = useState<"board" | "analytics" | "members">("board");
    const [titleFilter, setTitleFilter] = useState("");
    const [assigneeFilter, setAssigneeFilter] = useState("all");
    const [priorityFilters, setPriorityFilters] = useState<Set<Task["priority"]>>(new Set());

    const { data: project } = useQuery({
        queryKey: ["project", projectId],
        queryFn: async () => {
            const response = await api.get<{ data: Project }>(`/projects/${projectId}`);
            return response.data.data;
        },
        enabled: !!projectId,
    });

    const { data: tasks, isLoading } = useQuery({
        queryKey: ["tasks", projectId],
        queryFn: async () => {
            const response = await api.get<{ data: Task[] }>(`/projects/${projectId}/tasks`);
            return response.data.data;
        },
        enabled: !!projectId,
    });

    const createTaskMutation = useMutation({
        mutationFn: async (data: {
            title: string;
            description?: string;
            priority: string;
            projectId: string;
        }) => {
            const response = await api.post("/tasks", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
            setIsCreateModalOpen(false);
            setTaskTitle("");
            setTaskDescription("");
            setTaskPriority("medium");
        },
    });

    useEffect(() => {
        if (!projectId) return;

        let socket;
        
        try {
            socket = initSocket();
        } catch (error) {
            console.error("Failed to initialize socket:", error);
            return;
        }

        const handleTaskCreated = () => {
            queryClient.invalidateQueries({ 
                queryKey: ["tasks", projectId],
                refetchType: 'active' 
            });
        };

        const handleTaskUpdated = () => {
            queryClient.invalidateQueries({ 
                queryKey: ["tasks", projectId],
                refetchType: 'active' 
            });
        };

        const handleTaskDeleted = () => {
            queryClient.invalidateQueries({ 
                queryKey: ["tasks", projectId],
                refetchType: 'active' 
            });
        };

        const handleMembershipChanged = () => {
            queryClient.invalidateQueries({
                queryKey: ["project", projectId],
                refetchType: "active",
            });
        };

        socket.off("task:created");
        socket.off("task:updated");
        socket.off("task:deleted");
        socket.off("member:added");
        socket.off("member:removed");
        socket.off("member:ownership-transferred");

        socket.on("task:created", handleTaskCreated);
        socket.on("task:updated", handleTaskUpdated);
        socket.on("task:deleted", handleTaskDeleted);
        socket.on("member:added", handleMembershipChanged);
        socket.on("member:removed", handleMembershipChanged);
        socket.on("member:ownership-transferred", handleMembershipChanged);

        const performJoin = () => {
            joinProject(projectId);
        };

        if (socket.connected) {
            performJoin();
        } else {
            socket.once("connect", performJoin);
        }

        return () => {
            if (socket) {
                leaveProject(projectId);
                socket.off("task:created", handleTaskCreated);
                socket.off("task:updated", handleTaskUpdated);
                socket.off("task:deleted", handleTaskDeleted);
                socket.off("member:added", handleMembershipChanged);
                socket.off("member:removed", handleMembershipChanged);
                socket.off("member:ownership-transferred", handleMembershipChanged);
            }
        };
    }, [projectId]);

    const handleCreateTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) return;

        createTaskMutation.mutate({
            title: taskTitle,
            description: taskDescription || undefined,
            priority: taskPriority,
            projectId,
        });
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case "high":
                return "bg-red-100 text-red-800";
            case "medium":
                return "bg-yellow-100 text-yellow-800";
            case "low":
                return "bg-green-100 text-green-800";
            default:
                return "bg-gray-100 text-gray-800";
        }
    };

    const filteredTasks = (tasks ?? [])
        .filter((task) => task.title.toLowerCase().includes(titleFilter.toLowerCase()))
        .filter((task) => assigneeFilter === "all" || task.assignee?._id === assigneeFilter)
        .filter((task) => priorityFilters.size === 0 || priorityFilters.has(task.priority))
        .sort((first, second) => {
            const firstOverdue = first.status !== "done" && !!first.dueDate && new Date(first.dueDate).getTime() < Date.now();
            const secondOverdue = second.status !== "done" && !!second.dueDate && new Date(second.dueDate).getTime() < Date.now();
            return Number(secondOverdue) - Number(firstOverdue);
        });

    const todoTasks = filteredTasks.filter((t) => t.status === "todo");
    const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress");
    const doneTasks = filteredTasks.filter((t) => t.status === "done");

    const togglePriorityFilter = (priority: Task["priority"]) => {
        setPriorityFilters((current) => {
            const next = new Set(current);
            if (next.has(priority)) next.delete(priority);
            else next.add(priority);
            return next;
        });
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate("/")}
                                className="text-gray-600 hover:text-gray-900"
                            >
                                <svg
                                    className="w-6 h-6"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                    />
                                </svg>
                            </button>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">{project?.name}</h1>
                                <p className="text-sm text-gray-500">
                                    {project?.members.length} member{project?.members.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <NotificationBell />
                            <div className="flex bg-gray-100 rounded-lg p-0.5">
                                <button
                                    onClick={() => setActiveTab("board")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        activeTab === "board"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    Board
                                </button>
                                <button
                                    onClick={() => setActiveTab("analytics")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        activeTab === "analytics"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    Analytics
                                </button>
                                <button
                                    onClick={() => setActiveTab("members")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        activeTab === "members"
                                            ? "bg-white text-gray-900 shadow-sm"
                                            : "text-gray-500 hover:text-gray-700"
                                    }`}
                                >
                                    Members
                                </button>
                            </div>
                            {activeTab === "board" && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <svg
                                        className="w-5 h-5 mr-2"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 4v16m8-8H4"
                                        />
                                    </svg>
                                    New Task
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeTab === "analytics" ? (
                    <AnalyticsDashboard projectId={projectId!} />
                ) : activeTab === "members" && project ? (
                    <MembersPanel
                        projectId={projectId!}
                        members={project.members}
                        currentUserRole={
                            project.members.find(
                                (m) => m.user._id === useAuthStore.getState().user?.id
                            )?.role ?? "member"
                        }
                    />
                ) : isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-gray-500">Loading tasks...</div>
                    </div>
                ) : (
                    <>
                        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4">
                            <input
                                type="search"
                                value={titleFilter}
                                onChange={(event) => setTitleFilter(event.target.value)}
                                placeholder="Search task titles"
                                className="min-w-52 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                            />
                            <select
                                value={assigneeFilter}
                                onChange={(event) => setAssigneeFilter(event.target.value)}
                                className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                            >
                                <option value="all">All assignees</option>
                                {project?.members.map((member) => (
                                    <option key={member.user._id} value={member.user._id}>
                                        {member.user.firstName} {member.user.lastName}
                                    </option>
                                ))}
                            </select>
                            <div className="flex items-center gap-3 text-sm text-gray-600">
                                {(["low", "medium", "high"] as const).map((priority) => (
                                    <label key={priority} className="inline-flex items-center gap-1 capitalize">
                                        <input
                                            type="checkbox"
                                            checked={priorityFilters.has(priority)}
                                            onChange={() => togglePriorityFilter(priority)}
                                        />
                                        {priority}
                                    </label>
                                ))}
                            </div>
                            {(titleFilter || assigneeFilter !== "all" || priorityFilters.size > 0) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setTitleFilter("");
                                        setAssigneeFilter("all");
                                        setPriorityFilters(new Set());
                                    }}
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800"
                                >
                                    Clear filters
                                </button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-100 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-gray-900">
                                    To Do
                                    <span className="ml-2 text-sm text-gray-500">({todoTasks.length})</span>
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {todoTasks.map((task) => (
                                    <TaskCard
                                        key={task._id}
                                        task={task}
                                        getPriorityColor={getPriorityColor}
                                        onClick={() => setSelectedTask(task)}
                                    />
                                ))}
                                {todoTasks.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        No tasks yet
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-gray-900">
                                    In Progress
                                    <span className="ml-2 text-sm text-gray-500">({inProgressTasks.length})</span>
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {inProgressTasks.map((task) => (
                                    <TaskCard
                                        key={task._id}
                                        task={task}
                                        getPriorityColor={getPriorityColor}
                                        onClick={() => setSelectedTask(task)}
                                    />
                                ))}
                                {inProgressTasks.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        No tasks in progress
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="font-semibold text-gray-900">
                                    Done
                                    <span className="ml-2 text-sm text-gray-500">({doneTasks.length})</span>
                                </h2>
                            </div>
                            <div className="space-y-3">
                                {doneTasks.map((task) => (
                                    <TaskCard
                                        key={task._id}
                                        task={task}
                                        getPriorityColor={getPriorityColor}
                                        onClick={() => setSelectedTask(task)}
                                    />
                                ))}
                                {doneTasks.length === 0 && (
                                    <div className="text-center py-8 text-gray-400 text-sm">
                                        No completed tasks
                                    </div>
                                )}
                            </div>
                        </div>
                        </div>
                    </>
                )}
            </main>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Task</h3>
                        <form onSubmit={handleCreateTask}>
                            <div className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="taskTitle"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Task Title
                                    </label>
                                    <input
                                        id="taskTitle"
                                        type="text"
                                        required
                                        value={taskTitle}
                                        onChange={(e) => setTaskTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="What needs to be done?"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="taskDescription"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Description (optional)
                                    </label>
                                    <textarea
                                        id="taskDescription"
                                        value={taskDescription}
                                        onChange={(e) => setTaskDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Add more details..."
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="taskPriority"
                                        className="block text-sm font-medium text-gray-700 mb-1"
                                    >
                                        Priority
                                    </label>
                                    <select
                                        id="taskPriority"
                                        value={taskPriority}
                                        onChange={(e) =>
                                            setTaskPriority(e.target.value as "low" | "medium" | "high")
                                        }
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                </div>
                            </div>

                            {createTaskMutation.isError && (
                                <div className="mt-4 bg-red-50 text-red-600 p-3 rounded text-sm">
                                    Failed to create task. Please try again.
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setTaskTitle("");
                                        setTaskDescription("");
                                        setTaskPriority("medium");
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createTaskMutation.isPending}
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                                >
                                    {createTaskMutation.isPending ? "Creating..." : "Create Task"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Edit Modal */}
            {selectedTask && project && (
                <TaskEditModal
                    task={selectedTask}
                    projectId={projectId!}
                    projectMembers={project.members}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </div>
    );
};

const TaskCard = ({
    task,
    getPriorityColor,
    onClick,
}: {
    task: Task;
    getPriorityColor: (priority: string) => string;
    onClick: () => void;
}) => {
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
        >
            <div className="flex items-start justify-between mb-2">
                <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
                <span
                    className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(
                        task.priority
                    )}`}
                >
                    {task.priority}
                </span>
            </div>
            {task.description && (
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
            )}
            {task.dueDate && (
                <div className={`mb-3 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                    task.status !== "done" && new Date(task.dueDate).getTime() < Date.now()
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-600"
                }`}>
                    <span aria-hidden="true">{task.status !== "done" && new Date(task.dueDate).getTime() < Date.now() ? "!" : ""}</span>
                    {task.status !== "done" && new Date(task.dueDate).getTime() < Date.now() ? "Overdue" : `Due ${new Date(task.dueDate).toLocaleDateString()}`}
                </div>
            )}
            <div className="flex items-center justify-between">
                {task.assignee ? (
                    <div className="flex items-center text-xs text-gray-500">
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-2">
                            {task.assignee.firstName[0]}
                            {task.assignee.lastName[0]}
                        </div>
                        {task.assignee.firstName} {task.assignee.lastName}
                    </div>
                ) : (
                    <div className="text-xs text-gray-400">Unassigned</div>
                )}
            </div>
        </div>
    );
};

export default ProjectPage;