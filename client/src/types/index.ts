export interface User {
    id: string;
    _id?: string;
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    appRole?: "app_admin" | "user";
}

export interface Member {
    _id: string;
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
    meta: any;
    createdAt: string;
}

export interface AppNotification {
    _id: string;
    type: "task_assigned" | "comment_mention" | "due_soon" | "member_invited";
    payload: any;
    read: boolean;
    createdAt: string;
}
