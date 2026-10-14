import { useNow } from "../../hooks/useNow";
import type { Task } from "../../types";
import { Icon } from "../layout/Icon";
interface TaskCardProps { task: Task; canMove: boolean; onClick: () => void }
export const TaskCard = ({ task, onClick, canMove }: TaskCardProps) => {
  const now = useNow();
  const overdue = task.status !== "done" && !!task.dueDate && new Date(task.dueDate).getTime() < now;
  return <div role="button" tabIndex={0} aria-label={`Open task: ${task.title}`} onKeyDown={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onClick(); } }} draggable={canMove} onDragStart={event => { event.dataTransfer.setData("taskId", task._id); event.dataTransfer.effectAllowed = "move"; }} onClick={onClick} className="task-card">
    <div className="flex items-center justify-between"><span className={`priority ${task.priority}`}>{task.priority} priority</span><span className="text-[10px] text-slate-300" aria-hidden="true">•••</span></div>
    <h3>{task.title}</h3>{task.description && <p className="line-clamp-2">{task.description}</p>}
    <div className="task-card-footer"><span className={`flex items-center gap-1.5 text-[10px] ${overdue ? "text-rose-600" : "text-slate-400"}`}><Icon name="clock" size={12} />{task.dueDate ? `${overdue ? "Overdue · " : ""}${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "No due date"}</span>{task.assignee ? <span className="avatar !h-6 !w-6 !text-[8px]" title={`${task.assignee.firstName} ${task.assignee.lastName}`} aria-label={`Assigned to ${task.assignee.firstName} ${task.assignee.lastName}`}>{task.assignee.firstName[0]}{task.assignee.lastName[0]}</span> : <span className="text-[10px] text-slate-400">Unassigned</span>}</div>
  </div>;
};
