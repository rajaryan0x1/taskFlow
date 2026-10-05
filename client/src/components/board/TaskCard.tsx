import { Task } from "../../types";

interface TaskCardProps {
    task: Task;
    onClick: () => void;
}

export const getPriorityColor = (priority: string) => {
    switch (priority) {
        case "high":
            return "bg-red-100 text-red-800";
        case "medium":
            return "bg-yellow-100 text-yellow-800";
        case "low":
            return "bg-green-100 text-green-800";
        default:
            return "bg-gray-100 text-gray-800";
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
        className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
    >
        <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-gray-900 text-sm">{task.title}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority}
            </span>
        </div>
        {task.description && (
            <p className="text-xs text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}
        {task.dueDate && (
            <div className={`mb-3 inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                task.status !== "done" && new Date(task.dueDate).getTime() < Date.now()
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-600"
            }`}>
                <span aria-hidden="true">{task.status !== "done" && new Date(task.dueDate).getTime() < Date.now() ? "!" : ""}</span>
                {task.status !== "done" && new Date(task.dueDate).getTime() < Date.now() ? "Overdue" : `Due ${new Date(task.dueDate).toLocaleDateString()}`}
            </div>
        )}
        <div className="flex items-center justify-between">
            {task.assignee ? (
                <div className="flex items-center text-xs text-gray-500">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium mr-2">
                        {typeof task.assignee !== "string" ? task.assignee.firstName[0] : ""}
                        {typeof task.assignee !== "string" ? task.assignee.lastName[0] : ""}
                    </div>
                    {typeof task.assignee !== "string" ? `${task.assignee.firstName} ${task.assignee.lastName}` : "Assigned"}
                </div>
            ) : (
                <div className="text-xs text-gray-400">Unassigned</div>
            )}
        </div>
    </div>
);
