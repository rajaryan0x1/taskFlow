import type { Task } from "../../types";
import { KanbanColumn } from "./KanbanColumn";

interface KanbanBoardProps {
    todoTasks: Task[];
    inProgressTasks: Task[];
    doneTasks: Task[];
    canMoveTask: (task: Task) => boolean;
    onTaskClick: (task: Task) => void;
    onTaskDrop?: (taskId: string, newStatus: "todo" | "in_progress" | "done") => void;
}

export const KanbanBoard = ({ todoTasks, inProgressTasks, doneTasks, onTaskClick, onTaskDrop, canMoveTask }: KanbanBoardProps) => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KanbanColumn
            title="To Do"
            status="todo"
            tasks={todoTasks}
            onTaskDrop={onTaskDrop}
            canMoveTask={canMoveTask}
            onTaskClick={onTaskClick}
        />
        <KanbanColumn
            title="In Progress"
            status="in_progress"
            tasks={inProgressTasks}
            onTaskDrop={onTaskDrop}
            canMoveTask={canMoveTask}
            onTaskClick={onTaskClick}
        />
        <KanbanColumn
            title="Done"
            status="done"
            tasks={doneTasks}
            onTaskDrop={onTaskDrop}
            canMoveTask={canMoveTask}
            onTaskClick={onTaskClick}
        />
    </div>
);
