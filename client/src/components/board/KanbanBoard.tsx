import { Task } from "../../types";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
    todoTasks: Task[];
    inProgressTasks: Task[];
    doneTasks: Task[];
    onTaskClick: (task: Task) => void;
}

export const KanbanBoard = ({ todoTasks, inProgressTasks, doneTasks, onTaskClick }: KanbanBoardProps) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KanbanColumn
            title="To Do"
            tasks={todoTasks}
            colorClass="bg-gray-100"
            onTaskClick={onTaskClick}
        />
        <KanbanColumn
            title="In Progress"
            tasks={inProgressTasks}
            colorClass="bg-blue-50"
            onTaskClick={onTaskClick}
        />
        <KanbanColumn
            title="Done"
            tasks={doneTasks}
            colorClass="bg-green-50"
            onTaskClick={onTaskClick}
        />
    </div>
);
