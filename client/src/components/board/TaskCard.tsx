import { Task } from "../../types";

interface TaskCardProps {
    task: Task;
    onClick: () => void;
}

export const getPriorityColor = (priority: string) => {
    switch (priority) {
        case "high":
            return "bg-rose-900/40 text-rose-300";
        case "medium":
            return "bg-amber-900/40 text-amber-300";
        case "low":
            return "bg-emerald-900/40 text-emerald-300";
        default:
            return "bg-white/5 text-slate-200";
    }
};

export const TaskCard = ({ task, onClick }: TaskCardProps) => (
    <div
        draggable
        onDragStart={(e) => {
            e.dataTransfer.setData("taskId", task._id);
            e.dataTransfer.effectAllowed = "move";
        }}
        onClick={onClick}
        className="bg-white/5 backdrop-blur-md border border-white/10 text-white rounded-lg p-4 shadow-lg hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:border-white/30 transition-all duration-300 hover:-translate-y-1 cursor-pointer"
    >
        <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-white text-sm">{task.title}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
            </span>
        </div>
        {task.description && (
            <p className="text-xs text-slate-300 mb-3 line-clamp-2">{task.description}</p>
        )}
        {task.dueDate && (
            <div className={`mb-3 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                task.status !== "done" && new Date(task.dueDate).getTime() < Date.now()
                    ? "bg-rose-900/40 text-rose-300"
                    : "bg-white/5 text-slate-300"
            }`}>
                <span aria-hidden="true">{task.status !== "done" && new Date(task.dueDate).getTime() < Date.now() ? "!" : ""}</span>
                {task.status !== "done" && new Date(task.dueDate).getTime() < Date.now() ? "Overdue" : `Due ${new Date(task.dueDate).toLocaleDateString()}`}
            </div>
        )}
        <div className="flex items-center justify-between">
            {task.assignee ? (
                <div className="flex items-center text-xs text-slate-400">
                    <div className="w-6 h-6 rounded-full bg-blue-900/200 flex items-center justify-center text-white font-medium mr-2">
                        {typeof task.assignee !== "string" ? task.assignee.firstName[0] : ""}
                        {typeof task.assignee !== "string" ? task.assignee.lastName[0] : ""}
                    </div>
                    {typeof task.assignee !== "string" ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Assigned"}
                </div>
            ) : (
                <div className="text-xs text-slate-500">Unassigned</div>
            )}
        </div>
    </div>
);
