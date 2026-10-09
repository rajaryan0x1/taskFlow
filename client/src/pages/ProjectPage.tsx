import { nextCursor, type Page } from "../api/pagination";
import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery, useInfiniteQuery, useMutation } from "@tanstack/react-query";
import api from "../api/axios";
import { queryClient } from "../api/queryClient";
import { useProjectSocket } from "../hooks/useProjectSocket";
import { useNow } from "../hooks/useNow";
import { taskPermissions } from "../utils/taskPermissions";
import { getErrorMessage } from "../utils/apiError";
import TaskEditModal from "../components/TaskEditModal";
import CreateTaskModal from "../components/CreateTaskModal";
import { FilterBar } from "../components/board/FilterBar";
import { KanbanBoard } from "../components/board/KanbanBoard";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import MembersPanel from "../components/MembersPanel";
import { ProjectSettings } from "../components/ProjectSettings";
import { useAuthStore } from "../stores/authStore";
import NotificationBell from "../components/NotificationBell";
import type { Task, Project, TaskInput } from "../types";

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [params, setParams] = useSearchParams();
  const taskId = params.get("task");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("board");
  const [archivedTasks, setArchivedTasks] = useState(false);
  const user = useAuthStore(state => state.user);
  const [titleFilter, setTitleFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [priorityFilters, setPriorityFilters] = useState<Set<Task["priority"]>>(new Set());
  const now = useNow();
  const projectQuery = useQuery({ queryKey: ["project", projectId], queryFn: async ({ signal }) => (await api.get<{ data: Project }>(`/projects/${projectId}`, { signal })).data.data, enabled: !!projectId });
  const tasksQuery = useInfiniteQuery({
    queryKey: ["tasks", projectId, archivedTasks, titleFilter, assigneeFilter, [...priorityFilters].sort().join(",")],
    initialPageParam: undefined as string | undefined,
    getNextPageParam: nextCursor<Task>,
    queryFn: async ({ pageParam, signal }) => (await api.get<Page<Task>>(`/projects/${projectId}/tasks`, { signal, params: { archived: archivedTasks, cursor: pageParam, q: titleFilter || undefined, assignee: assigneeFilter === "all" ? undefined : assigneeFilter, priorities: priorityFilters.size ? [...priorityFilters].join(",") : undefined } })).data,
    enabled: !!projectId && !!projectQuery.data,
  });
  const detail = useQuery({ queryKey: ["task", projectId, taskId], queryFn: async ({ signal }) => (await api.get<{ data: Task }>(`/projects/${projectId}/tasks/${taskId}`, { signal })).data.data, enabled: !!projectQuery.data && !!taskId });
  const project = projectQuery.data;
  const role = project?.members.find(member => member.user._id === user?.id)?.role;
  const statusChange = useMutation({
    mutationFn: async ({ taskId, status, version }: { taskId: string; status: Task["status"]; version: number }) => api.patch(`/projects/${projectId}/tasks/${taskId}`, { status }, { headers: { "If-Match": `"${version}"` } }),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }); },
  });
  const create = useMutation({ mutationFn: async (data: TaskInput) => api.post(`/projects/${projectId}/tasks`, data), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["tasks", projectId] }); setCreateModalOpen(false); } });
  const connected = useProjectSocket(projectId);
  const tasks = (tasksQuery.data?.pages.flatMap(page => page.data) ?? []).filter(task => task.title.toLowerCase().includes(titleFilter.toLowerCase())).filter(task => assigneeFilter === "all" || (assigneeFilter === "unassigned" ? !task.assignee : task.assignee?._id === assigneeFilter)).filter(task => !priorityFilters.size || priorityFilters.has(task.priority)).sort((a, b) => Number(b.status !== "done" && !!b.dueDate && new Date(b.dueDate).getTime() < now) - Number(a.status !== "done" && !!a.dueDate && new Date(a.dueDate).getTime() < now));
  const closeTask = () => setParams(current => { current.delete("task"); return current; });
  if (projectQuery.isPending) return <main className="p-8" role="status">Loading project…</main>;
  if (projectQuery.isError || !project) return <main className="p-8"><Link to="/">Back to projects</Link><p role="alert" className="my-4">{getErrorMessage(projectQuery.error, "Project unavailable")}</p><button onClick={() => void projectQuery.refetch()}>Try again</button></main>;
  return <div className="min-h-screen">
    <header className="border-b border-white/10 bg-white/5 p-4"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
      <div><Link to="/" className="text-sm text-indigo-300">Back to projects</Link><h1 className="text-xl font-bold">{project.name}{project.isArchived && " (Archived)"}</h1><p className="text-sm text-slate-400">{project.members.length} members</p></div>
      <nav aria-label="Project sections" className="flex flex-wrap items-center gap-2">
        {["board", "analytics", "members", ...((role === "owner" || role === "admin") ? ["settings"] : [])].map(tab => <button key={tab} aria-pressed={activeTab === tab} onClick={() => setActiveTab(tab)} className={`rounded px-3 py-2 capitalize ${activeTab === tab ? "bg-indigo-600" : "bg-white/5"}`}>{tab}</button>)}
        <NotificationBell />
        {!project.isArchived && <button className="rounded bg-indigo-600 px-4 py-2" onClick={() => setCreateModalOpen(true)}>New task</button>}
      </nav>
    </div></header>
    <main className="mx-auto max-w-7xl px-4 py-8">
      {!connected && <p role="status" className="mb-4 text-amber-200">Live updates are reconnecting. Changes will refresh when the connection returns.</p>}
      {project.isArchived && <p className="mb-4 rounded bg-amber-900/30 p-3 text-amber-200">This project is archived and read-only.</p>}
      {activeTab === "analytics" ? <AnalyticsDashboard projectId={projectId!} /> : activeTab === "members" ? <MembersPanel projectId={projectId!} members={project.members} currentUserRole={role ?? "member"} readOnly={project.isArchived} /> : activeTab === "settings" && role ? <ProjectSettings key={`${project._id}:${project.isArchived}`} project={project} role={role} /> : <>
        <label className="mb-4 flex gap-2"><input type="checkbox" checked={archivedTasks} onChange={e => setArchivedTasks(e.target.checked)} />Show archived tasks</label>
        <FilterBar titleFilter={titleFilter} setTitleFilter={setTitleFilter} assigneeFilter={assigneeFilter} setAssigneeFilter={setAssigneeFilter} priorityFilters={priorityFilters} togglePriorityFilter={priority => setPriorityFilters(current => { const next = new Set(current); if (next.has(priority)) next.delete(priority); else next.add(priority); return next; })} clearFilters={() => { setTitleFilter(""); setAssigneeFilter("all"); setPriorityFilters(new Set()); }} projectMembers={project.members} />
        {tasksQuery.isPending ? <p role="status">Loading tasks…</p> : tasksQuery.isError ? <div role="alert">{getErrorMessage(tasksQuery.error)} <button onClick={() => void tasksQuery.refetch()}>Retry</button></div> : <KanbanBoard todoTasks={tasks.filter(task => task.status === "todo")} inProgressTasks={tasks.filter(task => task.status === "in_progress")} doneTasks={tasks.filter(task => task.status === "done")} onTaskClick={task => setParams(current => { current.set("task", task._id); return current; })} canMoveTask={task => !statusChange.isPending && taskPermissions(task, role, user?.id, project.isArchived).status} onTaskDrop={(id, status) => { const task = tasks.find(t => t._id === id); if (task && task.status !== status && taskPermissions(task, role, user?.id, project.isArchived).status && !statusChange.isPending) statusChange.mutate({ taskId: id, status, version: task.__v }); }} />}
        {tasksQuery.hasNextPage && <button disabled={tasksQuery.isFetchingNextPage} onClick={() => void tasksQuery.fetchNextPage()} className="mt-6 rounded bg-indigo-600 px-4 py-2">Load more tasks</button>}
        <p className="mt-3 text-sm text-slate-400">Showing {tasks.length} loaded tasks. Filters search the full project.</p>
        {statusChange.isError && <p role="alert" className="mt-4 text-rose-300">{getErrorMessage(statusChange.error, "Task could not be moved")}</p>}
      </>}
      {taskId && detail.isError && <p role="alert" className="mt-4 text-rose-300">{getErrorMessage(detail.error)} <button onClick={closeTask}>Dismiss</button></p>}
    </main>
    {isCreateModalOpen && !project.isArchived && <CreateTaskModal projectId={projectId!} projectMembers={project.members} onClose={() => setCreateModalOpen(false)} onSubmit={data => create.mutate(data)} isPending={create.isPending} isError={create.isError} error={create.error} />}
    {detail.data && taskId && <TaskEditModal key={taskId} task={detail.data} currentUserRole={role} projectArchived={project.isArchived} projectId={projectId!} projectMembers={project.members} onClose={closeTask} />}
  </div>;
}
