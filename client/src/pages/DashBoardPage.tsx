import { Modal } from "../components/Modal";
import { nextCursor, type Page } from "../api/pagination";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import api, { signOut } from "../api/axios";
import { useAuthStore } from "../stores/authStore";
import { getErrorMessage } from "../utils/apiError";
import { queryClient } from "../api/queryClient";
import NotificationBell from "../components/NotificationBell";

interface Project {
    _id: string;
    name: string;
    description?: string;
    owner: {
        _id: string;
        firstName: string;
        lastName: string;
    };
    members: Array<{
        user: {
            _id: string;
            firstName: string;
            lastName: string;
        };
        role: string;
    }>;
    createdAt: string;
}

const DashboardPage = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [projectName, setProjectName] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [logoutError, setLogoutError] = useState("");
    const [showArchived, setShowArchived] = useState(false);

    const projectsQuery = useInfiniteQuery({
        queryKey: ["projects", showArchived],
        initialPageParam: undefined as string | undefined,
        getNextPageParam: nextCursor<Project>,
        queryFn: async ({ pageParam, signal }) => {
            const response = await api.get<Page<Project>>(`/projects`, { signal, params: { archived: showArchived, cursor: pageParam } });
            return response.data;
        },
    });

    const { isLoading, error } = projectsQuery;
    const data = projectsQuery.data?.pages.flatMap(page => page.data);

    const createProjectMutation = useMutation({
        mutationFn: async (data: { name: string; description?: string }) => {
            const response = await api.post("/projects", data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["projects"] });
            setIsCreateModalOpen(false);
            setProjectName("");
            setProjectDescription("");
        },
    });

    const handleCreateProject = (e: React.FormEvent) => {
        e.preventDefault();
        createProjectMutation.mutate({
            name: projectName,
            description: projectDescription || undefined,
        });
    };

    const handleLogout = async (all = false) => {
        try { await signOut(all); navigate("/login"); }
        catch { setLogoutError("Sign out failed. Please try again."); }
    };

    return (
        <div className="min-h-screen bg-transparent">
            {/* Header */}
            <header className="bg-white/5 backdrop-blur-md border border-white/10 text-white border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap justify-between items-center min-h-16 gap-4 py-3">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-white">TaskFlow</h1>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <NotificationBell />
                            <button onClick={() => navigate("/account")} className="text-sm text-indigo-300">Account</button>
                            <div className="text-sm text-slate-300">
                                Welcome, <span className="font-medium text-white">{user?.firstName}</span>
                            </div>
                            <button
                                onClick={() => void handleLogout()}
                                className="text-sm text-slate-300 hover:text-white font-medium"
                            >
                                Logout
                            </button>
                            <button onClick={() => void handleLogout(true)} className="text-sm text-slate-300 hover:text-white">Sign out all devices</button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Page Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-white">My Projects</h2>
                        <p className="mt-1 text-sm text-slate-400">
                            Manage and collaborate on your projects
                        </p>
                    </div>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
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
                        New Project
                    </button>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer ml-4">
                        <input
                            type="checkbox"
                            checked={showArchived}
                            onChange={(e) => setShowArchived(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900/50 border-white/10"
                        />
                        Show Archived
                    </label>
                </div>

                {/* Loading State */}
                {isLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div
                                key={i}
                                className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg shadow-sm border border-white/10 p-6 animate-pulse"
                            >
                                <div className="h-6 bg-white/10 rounded w-3/4 mb-4"></div>
                                <div className="h-4 bg-white/10 rounded w-full mb-2"></div>
                                <div className="h-4 bg-white/10 rounded w-2/3"></div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Error State */}
                {user?.needsProfileCompletion && <p className="mb-4 text-amber-200">Finish setting up your profile in <button className="underline" onClick={() => navigate("/account")}>Account settings</button>.</p>}
                {logoutError && <p role="alert" className="text-rose-300">{logoutError}</p>}
                {error && (
                    <div className="bg-rose-900/20 border border-red-200 rounded-lg p-4 text-red-600">
                        Failed to load projects. Please try again.
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && !error && data?.length === 0 && (
                    <div className="text-center py-12">
                        <svg
                            className="mx-auto h-12 w-12 text-slate-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <h3 className="mt-2 text-sm font-medium text-white">No projects</h3>
                        <p className="mt-1 text-sm text-slate-400">
                            Get started by creating a new project.
                        </p>
                        <div className="mt-6">
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
                                New Project
                            </button>
                        </div>
                    </div>
                )}

                {/* Projects Grid */}
                {!isLoading && !error && data && data.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {data.map((project) => (
                            <div
                                key={project._id}
                                role="button"
                                tabIndex={0}
                                onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/projects/${project._id}`); } }}
                                onClick={() => navigate(`/projects/${project._id}`)}
                                className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-2xl shadow-lg hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:border-white/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer group p-6"
                            >
                                <h3 className="text-lg font-semibold text-white group-hover:text-indigo-400 transition-colors">
                                    {project.name}
                                </h3>
                                <p className="mt-2 text-sm text-slate-300 line-clamp-2">
                                    {project.description || "No description"}
                                </p>
                                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                                    <div className="flex items-center">
                                        <svg
                                            className="w-4 h-4 mr-1"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                            />
                                        </svg>
                                        {project.members.length} member{project.members.length !== 1 ? "s" : ""}
                                    </div>
                                    <div>
                                        Owner: {project.owner.firstName} {project.owner.lastName}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {projectsQuery.hasNextPage && <button className="mt-6 rounded bg-indigo-600 px-4 py-2" disabled={projectsQuery.isFetchingNextPage} onClick={() => void projectsQuery.fetchNextPage()}>Load more projects</button>}
            </main>

            {/* Create Project Modal */}
            {isCreateModalOpen && (
                <Modal title="Create project" onClose={() => setIsCreateModalOpen(false)}>
                    <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">
                            Create New Project
                        </h3>
                        <form onSubmit={handleCreateProject}>
                            <div className="space-y-4">
                                <div>
                                    <label
                                        htmlFor="projectName"
                                        className="block text-sm font-medium text-slate-200 mb-1"
                                    >
                                        Project Name
                                    </label>
                                    <input
                                        id="projectName"
                                        type="text"
                                        required
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                        className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="My Awesome Project"
                                    />
                                </div>
                                <div>
                                    <label
                                        htmlFor="projectDescription"
                                        className="block text-sm font-medium text-slate-200 mb-1"
                                    >
                                        Description (optional)
                                    </label>
                                    <textarea
                                        id="projectDescription"
                                        value={projectDescription}
                                        onChange={(e) => setProjectDescription(e.target.value)}
                                        rows={3}
                                        className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm focus:outline-hidden focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="What's this project about?"
                                    />
                                </div>
                            </div>

                            {createProjectMutation.isError && (
                                <div className="mt-4 bg-rose-900/20 text-red-600 p-3 rounded text-sm border border-red-500/30">
                                    {getErrorMessage(createProjectMutation.error)}
                                </div>
                            )}

                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        setProjectName("");
                                        setProjectDescription("");
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-slate-200 hover:bg-transparent border border-white/10 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createProjectMutation.isPending}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {createProjectMutation.isPending ? "Creating..." : "Create Project"}
                                </button>
                            </div>
                        </form>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default DashboardPage;