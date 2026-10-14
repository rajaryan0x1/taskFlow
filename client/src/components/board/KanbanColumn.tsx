import type { Task } from "../../types";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
    title: string;
    status: "todo" | "in_progress" | "done";
    tasks: Task[];
    canMoveTask: (task: Task) => boolean;
    onTaskClick: (task: Task) => void;
    onTaskDrop?: (taskId: string, newStatus: "todo" | "in_progress" | "done") => void;
}

export const KanbanColumn = ({ title, status, tasks, onTaskClick, onTaskDrop, canMoveTask }: KanbanColumnProps) => (
    <div
        className="kanban-column"
        onDragOver={(e) => {
            if (onTaskDrop) e.preventDefault();
        }}
        onDrop={(e) => {
            if (!onTaskDrop) return;
            e.preventDefault();
            const taskId = e.dataTransfer.getData("taskId");
            if (taskId) {
                onTaskDrop(taskId, status);
            }
        }}
    >
        <div className="column-heading">
            <span className={`status-dot ${status}`} /><h2 className="font-semibold text-slate-700">
                {title}
            </h2><span className="column-count">{tasks.length}</span>
        </div>
        <div className="space-y-3">
            {tasks.map((task) => (
                <TaskCard
                    key={task._id}
                    task={task}
                    canMove={canMoveTask(task)}
                    onClick={() => onTaskClick(task)}
                />
            ))}
            {tasks.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300/70 px-4 py-10 text-center text-xs text-slate-400">
                    No tasks yet
                </div>
            )}
        </div>
    </div>
);
