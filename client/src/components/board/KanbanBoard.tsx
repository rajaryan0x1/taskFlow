import { Task } from "../../types";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
    todoTasks: Task[];
    inProgressTasks: Task[];
    doneTasks: Task[];
    onTaskClick: (task: Task) => void;
    onTaskDrop?: (taskId: string, newStatus: "todo" | "in_progress" | "done") => void;
}

export const KanbanBoard = ({ todoTasks, inProgressTasks, doneTasks, onTaskClick, onTaskDrop }: KanbanBoardProps) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KanbanColumn
            title="To Do"
            status="todo"
            tasks={todoTasks}
            onTaskDrop={onTaskDrop}
            colorClass="bg-gray-100"
            onTaskClick={onTaskClick}
        />
        <KanbanColumn
            title="In Progress"
            status="in_progress"
            tasks={inProgressTasks}
            onTaskDrop={onTaskDrop}
            colorClass="bg-blue-50"
            onTaskClick={onTaskClick}
        />
        <KanbanColumn
            title="Done"
            status="done"
            tasks={doneTasks}
            onTaskDrop={onTaskDrop}
            colorClass="bg-green-50"
            onTaskClick={onTaskClick}
        />
    </div>
);
