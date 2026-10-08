import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { queryClient } from "../api/queryClient";
import { useProjectSocket } from "../hooks/useProjectSocket";
import TaskEditModal from "../components/TaskEditModal";
import CreateTaskModal from "../components/CreateTaskModal";
import { FilterBar } from "../components/board/FilterBar";
import { KanbanBoard } from "../components/board/KanbanBoard";

import AnalyticsDashboard from "../components/AnalyticsDashboard";
import MembersPanel from "../components/MembersPanel";
import { useAuthStore } from "../stores/authStore";
import NotificationBell from "../components/NotificationBell";
import type { Task, Project } from "../types";



const ProjectPage = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [activeTab, setActiveTab] = useState<"board" | "analytics" | "members" | "settings">("board");
        const currentUser = useAuthStore((state) => state.user);
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

    
    
    
    const updateTaskStatusMutation = useMutation({
        mutationFn: async (data: { taskId: string; status: "todo" | "in_progress" | "done" }) => {
            const response = await api.patch(`/projects/${projectId}/tasks/${data.taskId}`, { status: data.status });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
        },
    });

    const handleTaskDrop = (taskId: string, newStatus: "todo" | "in_progress" | "done") => {
        updateTaskStatusMutation.mutate({ taskId, status: newStatus });
    };

    const createTaskMutation = useMutation({
        mutationFn: async (data: {
            title: string;
            description?: string;
            priority: string;
            projectId: string;
        }) => {
            const response = await api.post(`/projects/${projectId}/tasks`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
            setIsCreateModalOpen(false);
            
        },
    });

    useProjectSocket(projectId);

    
    
    const filteredTasks = (tasks ?? [])
        .filter((task) => task.title.toLowerCase().includes(titleFilter.toLowerCase()))
        .filter((task) => assigneeFilter === "all" || task.assignee?._id === assigneeFilter)
        .filter((task) => priorityFilters.size === 0 || priorityFilters.has(task.priority))
        .sort((first, second) => {
            const firstOverdue = first.status !== "done" && !!first.dueDate && new Date(first.dueDate).getTime() < Date.now();
            const secondOverdue = second.status !== "done" && !!second.dueDate && new Date(second.dueDate).getTime() < Date.now();
            return Number(secondOverdue) - Number(firstOverdue);
        });

    const currentUserRole = project?.members.find((m) => m.user._id === currentUser?.id)?.role as "owner" | "admin" | "member" | undefined;
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
        <div className="min-h-screen bg-transparent">
            <header className="bg-white/5 backdrop-blur-md border border-white/10 text-white border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate("/")}
                                className="text-slate-300 hover:text-white"
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
                                <h1 className="text-xl font-bold text-white">{project?.name} {(project as any)?.archived && <span className="text-sm font-medium text-red-600 bg-rose-900/20 px-2 py-0.5 rounded-full ml-2 align-middle border border-red-200">(Archived)</span>}</h1>
                                <p className="text-sm text-slate-400">
                                    {project?.members.length} member{project?.members.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <NotificationBell />
                            <div className="flex bg-white/5 rounded-lg p-0.5">
                                <button
                                    onClick={() => setActiveTab("board")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        activeTab === "board"
                                            ? "bg-white/5 backdrop-blur-md border border-white/10 text-white text-white shadow-sm"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    Board
                                </button>
                                <button
                                    onClick={() => setActiveTab("analytics")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        activeTab === "analytics"
                                            ? "bg-white/5 backdrop-blur-md border border-white/10 text-white text-white shadow-sm"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    Analytics
                                </button>
                                <button
                                    onClick={() => setActiveTab("members")}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                        activeTab === "members"
                                            ? "bg-white/5 backdrop-blur-md border border-white/10 text-white text-white shadow-sm"
                                            : "text-slate-400 hover:text-slate-200"
                                    }`}
                                >
                                    Members
                                </button>
                            </div>
                            {activeTab === "board" && (
                                <button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all"
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
                        members={project.members as any}
                        currentUserRole={
                            project.members.find(
                                (m) => m.user._id === useAuthStore.getState().user?.id
                            )?.role ?? "member"
                        }
                    />
                ) : isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-slate-400">Loading tasks...</div>
                    </div>
                ) : (
                    <>

                        <FilterBar
                            titleFilter={titleFilter}
                            setTitleFilter={setTitleFilter}
                            assigneeFilter={assigneeFilter}
                            setAssigneeFilter={setAssigneeFilter}
                            priorityFilters={priorityFilters}
                            togglePriorityFilter={togglePriorityFilter}
                            clearFilters={() => {
                                setTitleFilter("");
                                setAssigneeFilter("all");
                                setPriorityFilters(new Set());
                            }}
                            projectMembers={(project?.members as any) || []}
                        />
                        <KanbanBoard
                            todoTasks={todoTasks}
                            inProgressTasks={inProgressTasks}
                            doneTasks={doneTasks}
                            onTaskClick={setSelectedTask}
                            onTaskDrop={handleTaskDrop}
                        />
                    </>
                )}
            </main>
            {/* Task Create Modal */}
            {isCreateModalOpen && project && (
                <CreateTaskModal
                    projectId={projectId!}
                    projectMembers={project.members as any}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSubmit={(taskData) => createTaskMutation.mutate(taskData)}
                    isPending={createTaskMutation.isPending}
                    isError={createTaskMutation.isError}
                    error={createTaskMutation.error}
                />
            )}

            {/* Task Edit Modal */}
            {selectedTask && project && (
                <TaskEditModal
                    task={selectedTask}
                    currentUserRole={currentUserRole}
                    projectId={projectId!}
                    projectMembers={project.members as any}
                    onClose={() => setSelectedTask(null)}
                />
            )}
        </div>
    );
};


export default ProjectPage;
