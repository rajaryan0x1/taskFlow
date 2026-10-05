import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import type { Project } from "../types";

interface ProjectSettingsProps {
    project: Project;
}

export const ProjectSettings = ({ project }: ProjectSettingsProps) => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const [name, setName] = useState(project.name);
    const [description, setDescription] = useState(project.description);

    const updateProjectMutation = useMutation({
        mutationFn: async (data: { name: string; description: string }) => {
            const res = await api.put(`/projects/${project._id}`, data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", project._id] });
            alert("Project updated successfully");
        },
    });

    const toggleArchiveMutation = useMutation({
        mutationFn: async () => {
            if (project.archived) {
                await api.post(`/projects/${project._id}/restore`);
            } else {
                await api.delete(`/projects/${project._id}`); // Backend handles delete/archive
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", project._id] });
            navigate("/");
        },
    });

    const hardDeleteMutation = useMutation({
        mutationFn: async () => {
            await api.delete(`/projects/${project._id}/hard`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["project", project._id] });
            navigate("/");
        },
    });

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        updateProjectMutation.mutate({ name, description });
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Project Details</h3>
                <form onSubmit={handleUpdate} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-white/10 rounded-md bg-slate-900/50 text-white placeholder-slate-400 focus:ring-indigo-500 focus:border-indigo-500 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={updateProjectMutation.isPending || (name === project.name && description === project.description)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {updateProjectMutation.isPending ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg border border-red-200 p-6">
                <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
                
                <div className="space-y-6">
                    <div className="flex items-center justify-between py-4 border-b border-white/10">
                        <div>
                            <h4 className="font-medium text-white">
                                {project.archived ? "Restore Project" : "Archive Project"}
                            </h4>
                            <p className="text-sm text-slate-400 mt-1">
                                {project.archived 
                                    ? "Restore this project to make it active again."
                                    : "Archived projects become read-only and are hidden from the default dashboard view."}
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm(`Are you sure you want to ${project.archived ? 'restore' : 'archive'} this project?`)) {
                                    toggleArchiveMutation.mutate();
                                }
                            }}
                            disabled={toggleArchiveMutation.isPending}
                            className="px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 text-white border border-red-300 text-red-600 rounded-md hover:bg-rose-900/20 disabled:opacity-50 font-medium"
                        >
                            {project.archived ? "Restore Project" : "Archive Project"}
                        </button>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div>
                            <h4 className="font-medium text-white">Delete Project</h4>
                            <p className="text-sm text-slate-400 mt-1">
                                Permanently delete this project and all its tasks, comments, and activity logs. This action cannot be undone.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                if (window.confirm("Are you absolutely sure you want to PERMANENTLY delete this project? This cannot be undone.")) {
                                    hardDeleteMutation.mutate();
                                }
                            }}
                            disabled={hardDeleteMutation.isPending}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
                        >
                            Delete Project
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
