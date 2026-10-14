import { Modal } from "../components/Modal";
import { nextCursor, type Page } from "../api/pagination";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { useAuthStore } from "../stores/authStore";
import { getErrorMessage } from "../utils/apiError";
import { queryClient } from "../api/queryClient";
import { Icon } from "../components/layout/Icon";
import { PersonalTasks } from "../components/PersonalTasks";
import { usePersonalTasks } from "../hooks/usePersonalTasks";
import type { Project } from "../types";

export default function DashboardPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const user = useAuthStore(state => state.user);
  const personal = usePersonalTasks();
  const summary = personal.data?.pages[0]?.summary;
  const projects = useInfiniteQuery({
    queryKey: ["projects", showArchived], initialPageParam: undefined as string | undefined, getNextPageParam: nextCursor<Project>,
    queryFn: async ({ pageParam, signal }) => (await api.get<Page<Project>>("/projects", { signal, params: { archived: showArchived, cursor: pageParam } })).data,
  });
  const data = projects.data?.pages.flatMap(page => page.data) ?? [];
  const create = useMutation({
    mutationFn: async () => api.post("/projects", { name: projectName, description: projectDescription || undefined }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["projects"] }); setIsCreateModalOpen(false); setProjectName(""); setProjectDescription(""); },
  });
  return <main className="page">
    <div className="page-heading"><div><span className="eyebrow">YOUR WORK, IN PERSPECTIVE</span><h1 className="mt-2">Overview</h1><p>A clear view of what’s happening and what’s next.</p></div><button className="btn-primary" onClick={() => { create.reset(); setIsCreateModalOpen(true); }}><Icon name="plus" size={16} />New Project</button></div>
    {user?.needsProfileCompletion && <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Make this space yours. <Link to="/account" className="underline">Complete your profile</Link> to get started.</div>}
    <div className="dashboard-bento"><section className="surface welcome-card"><span className="eyebrow">LET’S MAKE PROGRESS</span><h2>Welcome back, <span>{user?.firstName}</span>.</h2><p>Big ideas move forward one small task at a time.</p><div className="welcome-orbit" aria-hidden="true" /></section><section className="surface stat-card"><div className="stat-label">Assigned to you<Icon name="check" size={16} /></div><strong className="stat-value">{summary?.total ?? "—"}</strong><small>Open tasks across your projects</small></section><section className="surface stat-card"><div className="stat-label">Needs attention<Icon name="clock" size={16} /></div><strong className={`stat-value ${summary?.overdue ? "text-rose-600" : ""}`}>{summary?.overdue ?? "—"}</strong><small>Tasks past their due date</small></section></div>
    <div className="section-heading"><div><h2>My Projects <span className="ml-2 badge">{data.length}{projects.hasNextPage ? "+" : ""}</span></h2><p>Your shared spaces for moving work forward.</p></div><label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)} />Show Archived</label></div>
    {projects.isPending ? <div className="project-grid" role="status" aria-label="Loading projects">{[1,2,3].map(i => <div key={i} className="surface h-52 animate-pulse bg-slate-100" />)}</div> : projects.isError ? <div className="surface p-6" role="alert"><p className="error-message">{getErrorMessage(projects.error, "Projects couldn’t be loaded.")}</p><button className="btn-secondary" onClick={() => void projects.refetch()}>Try again</button></div> : data.length === 0 ? <div className="surface empty-state"><span className="project-monogram"><Icon name="folder" size={21} /></span><h3>A fresh space for your next idea</h3><p>Create your first project, invite your team, and turn plans into progress.</p><button className="btn-secondary" onClick={() => setIsCreateModalOpen(true)}><Icon name="plus" size={16} />Create your first project</button></div> : <div className="project-grid">{data.map(project => <Link key={project._id} to={`/projects/${project._id}`} className="surface project-card"><div className="flex items-center justify-between"><span className="project-monogram">{project.name.slice(0,2).toUpperCase()}</span><span className={`badge ${!project.isArchived ? "badge-active" : ""}`}>{project.isArchived ? "Archived" : "Active"}</span></div><h3>{project.name}</h3><p className="mb-5 line-clamp-2">{project.description || "A space for your team’s next great idea."}</p><div className="project-card-footer"><div className="flex items-center gap-2"><span className="avatar-stack">{project.members.slice(0,3).map(member => <span className="avatar" key={member.user._id} title={`${member.user.firstName} ${member.user.lastName}`}>{member.user.firstName[0]}{member.user.lastName[0]}</span>)}</span><span>{project.members.length} member{project.members.length !== 1 ? "s" : ""}</span></div><Icon name="arrow" size={15} /></div></Link>)}</div>}
    {projects.hasNextPage && <button className="btn-secondary mt-4" disabled={projects.isFetchingNextPage} onClick={() => void projects.fetchNextPage()}>Load more projects</button>}
    <div className="mt-7"><PersonalTasks /></div>
    {isCreateModalOpen && <Modal title="Create project" onClose={() => setIsCreateModalOpen(false)}><div className="p-7"><div className="mb-6 flex items-start justify-between"><div><span className="eyebrow">START SOMETHING GOOD</span><h2 className="mt-2 text-xl font-semibold tracking-tight">Create New Project</h2><p className="mt-1 text-xs text-slate-500">Give your team a shared space to do their best work.</p></div><button className="icon-button" aria-label="Close create project" onClick={() => setIsCreateModalOpen(false)}><Icon name="close" /></button></div><form onSubmit={e => { e.preventDefault(); create.mutate(); }} className="space-y-5"><div><label htmlFor="projectName">Project Name</label><input id="projectName" required minLength={2} maxLength={100} value={projectName} onChange={e => setProjectName(e.target.value)} className="mt-2 block w-full border p-3 text-sm" placeholder="e.g. Website redesign" /></div><div><label htmlFor="projectDescription">Description (optional)</label><textarea id="projectDescription" maxLength={500} rows={3} value={projectDescription} onChange={e => setProjectDescription(e.target.value)} className="mt-2 block w-full border p-3 text-sm" placeholder="What are we working toward?" /></div>{create.isError && <p className="error-message" role="alert">{getErrorMessage(create.error)}</p>}<div className="flex justify-end gap-3 border-t border-slate-100 pt-5"><button type="button" className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button><button className="btn-primary" disabled={create.isPending}>{create.isPending ? "Creating…" : "Create Project"}</button></div></form></div></Modal>}
  </main>;
}
