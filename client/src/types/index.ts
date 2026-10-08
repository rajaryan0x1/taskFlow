export interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    appRole?: "app_admin" | "user";
}

export interface Member {
    user: User;
    role: "owner" | "admin" | "member";
    joinedAt: string;
}

export interface Project {
    _id: string;
    name: string;
    description: string;
    owner: User;
    members: Member[];
    createdAt: string;
    isArchived: boolean;
    updatedAt: string;
}

export interface Task {
    _id: string;
    title: string;
    description: string;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
    assignee: User | null;
    project: string;
    createdBy: User | string;
    dueDate?: string;
    createdAt: string;
    isArchived: boolean;
    updatedAt: string;
}

export interface Comment {
    _id: string;
    body: string;
    author: User;
    createdAt: string;
}

export interface Activity {
    _id: string;
    type: string;
    actor: User;
    meta: Record<string, unknown>;
    createdAt: string;
}

export interface AppNotification {
    _id: string;
    type: "task_assigned" | "comment_mention" | "due_soon" | "member_invited";
    payload: { projectId?: string; taskId?: string; taskTitle?: string; projectName?: string };
    read: boolean;
    createdAt: string;
}

export interface TaskInput {
    title: string;
    description?: string;
    status?: Task["status"];
    priority: Task["priority"];
    assignee?: string | null;
    dueDate?: string | null;
    projectId?: string;
}
export type TaskUpdate = Partial<TaskInput>;
