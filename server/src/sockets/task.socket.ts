// Socket logic for task
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { Project } from "../models/Project.js";

interface AuthenticatedSocket extends Socket {
    data: {
        userId: string;
        role: "app_admin" | "user";
    };
}

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: env.CORS_ORIGINS,
            credentials: true,
        },
    });

    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as {
                sub: string;
                role: "app_admin" | "user";
            };

            if (!decoded?.sub || !decoded?.role) {
                return next(new Error("Authentication error: Invalid token payload"));
            }

            socket.data.userId = decoded.sub;
            socket.data.role = decoded.role;
            next();
        } catch {
            return next(new Error("Authentication error: Invalid token"));
        }
    });

    io.on("connection", (socket: AuthenticatedSocket) => {
        socket.join(`user:${socket.data.userId}`);

        socket.on("project:join", async (projectId: string) => {
            if (!projectId || typeof projectId !== "string" || !Types.ObjectId.isValid(projectId)) {
                socket.emit("error", { message: "Invalid project ID" });
                return;
            }

            try {
                const project = await Project.findById(projectId);

                if (!project || !project.getMemberRole(socket.data.userId)) {
                    socket.emit("error", { message: "Not authorized to join this project" });
                    return;
                }

                const roomName = `project:${projectId}`;
                socket.join(roomName);
                socket.to(roomName).emit("user:joined", {
                    userId: socket.data.userId,
                    projectId,
                });
            } catch {
                socket.emit("error", { message: "Unable to join project" });
            }
        });

        socket.on("project:leave", (projectId: string) => {
            const roomName = `project:${projectId}`;
            socket.leave(roomName);
            socket.to(roomName).emit("user:left", {
                userId: socket.data.userId,
                projectId,
            });
        });
    });

    return io;
};

export const broadcastTaskUpdate = (
    io: SocketIOServer,
    projectId: string,
    task: any
): void => {
    const roomName = `project:${projectId}`;
    io.to(roomName).emit("task:updated", task);
};

export const broadcastTaskCreate = (
    io: SocketIOServer,
    projectId: string,
    task: any
): void => {
    const roomName = `project:${projectId}`;
    io.to(roomName).emit("task:created", task);
};

export const broadcastTaskDelete = (
    io: SocketIOServer,
    projectId: string,
    taskId: string
): void => {
    const roomName = `project:${projectId}`;
    io.to(roomName).emit("task:deleted", { taskId });
};

export const broadcastMemberAdded = (
    io: SocketIOServer,
    projectId: string,
    member: unknown
): void => {
    io.to(`project:${projectId}`).emit("member:added", { projectId, member });
};

export const broadcastMemberRemoved = (
    io: SocketIOServer,
    projectId: string,
    userId: string
): void => {
    io.to(`project:${projectId}`).emit("member:removed", { projectId, userId });
};

export const broadcastOwnershipTransferred = (
    io: SocketIOServer,
    projectId: string,
    newOwnerId: string
): void => {
    io.to(`project:${projectId}`).emit("member:ownership-transferred", {
        projectId,
        newOwnerId,
    });
};

export const broadcastCommentCreated = (
    io: SocketIOServer,
    projectId: string,
    comment: unknown
): void => {
    io.to(`project:${projectId}`).emit("comment:created", comment);
};

export const broadcastCommentDeleted = (
    io: SocketIOServer,
    projectId: string,
    commentId: string
): void => {
    io.to(`project:${projectId}`).emit("comment:deleted", { commentId });
};

export const broadcastActivityCreated = (
    io: SocketIOServer,
    projectId: string,
    activity: unknown
): void => {
    io.to(`project:${projectId}`).emit("activity:created", activity);
};
