import { Task } from "../../types";
import { TaskCard } from "./TaskCard";

interface KanbanColumnProps {
    title: string;
    status: "todo" | "in_progress" | "done";
    tasks: Task[];
    colorClass: string;
    onTaskClick: (task: Task) => void;
    onTaskDrop?: (taskId: string, newStatus: "todo" | "in_progress" | "done") => void;
}

export const KanbanColumn = ({ title, status, tasks, colorClass, onTaskClick, onTaskDrop }: KanbanColumnProps) => (
    <div
        className={`${colorClass} rounded-2xl p-4 min-h-[200px] backdrop-blur-md border border-white/10 shadow-2xl`}
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
        <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">
                {title}
                <span className="ml-2 text-sm text-slate-400">({tasks.length})</span>
            </h2>
        </div>
        <div className="space-y-3">
            {tasks.map((task) => (
                <TaskCard
                    key={task._id}
                    task={task}
                    onClick={() => onTaskClick(task)}
                />
            ))}
            {tasks.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-sm">
                    No tasks yet
                </div>
            )}
        </div>
    </div>
);
