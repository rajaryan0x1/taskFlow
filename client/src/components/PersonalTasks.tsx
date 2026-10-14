import { Link } from "react-router-dom";
import { usePersonalTasks } from "../hooks/usePersonalTasks";
import { Icon } from "./layout/Icon";
import { useNow } from "../hooks/useNow";

export function PersonalTasks({ full = false }: { full?: boolean }) {
  const query = usePersonalTasks(full ? 20 : 6);
  const now = useNow();
  const tasks = query.data?.pages.flatMap(page => page.data) ?? [];
  return <section className="surface overflow-hidden">
    <div className="flex items-center justify-between gap-4 px-6 py-5"><div><h2 className="font-semibold tracking-tight">{full ? "Your work queue" : "Your next moves"}</h2><p className="mt-1 text-xs text-slate-500">Open tasks assigned to you · newest first</p></div>{!full && <Link className="flex items-center gap-2 text-xs font-medium text-indigo-600" to="/my-tasks">View all<Icon name="arrow" size={14} /></Link>}</div>
    {query.isPending ? <p className="p-6 text-sm text-slate-500" role="status">Loading your tasks…</p> : query.isError ? <div className="p-6" role="alert"><p className="error-message">Your tasks couldn’t be loaded.</p><button className="btn-secondary" onClick={() => void query.refetch()}>Try again</button></div> : !tasks.length ? <div className="empty-state border-t border-slate-100"><span className="project-monogram"><Icon name="check" /></span><h3>You’re all caught up</h3><p>No open tasks are assigned to you. Choose a project to plan your next step.</p></div> : tasks.map(task => <Link key={task._id} className="task-list-row" to={`/projects/${task.project}?task=${task._id}`}><span className={`task-ring ${task.status}`} /><span className="min-w-0 flex-1"><strong className="break-words">{task.title}</strong><small>{task.projectName}</small></span><span className={`priority ${task.priority}`}>{task.priority}</span>{task.dueDate && <span className={`due-label ${new Date(task.dueDate).getTime() < now ? "overdue" : ""}`}>{new Date(task.dueDate).getTime() < now ? "Overdue · " : ""}{new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>}<Icon name="arrow" size={14} /></Link>)}
    {full && query.hasNextPage && <div className="border-t border-slate-100 p-4 text-center"><button className="btn-secondary" disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>{query.isFetchingNextPage ? "Loading…" : "Load more tasks"}</button></div>}
  </section>;
}
