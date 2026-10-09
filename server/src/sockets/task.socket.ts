import { events } from "@taskflow/contracts";
// Socket logic for task
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { authenticateSession } from "../services/session.js";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { Project } from "../models/Project.js";

interface AuthenticatedSocket extends Socket {
    data: {
        userId: string;
        role: "app_admin" | "user";
        tokenHash: string;
        expiresAt: Date;
    };
}

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
    const io = new SocketIOServer(httpServer, {
        allowRequest: (req, done) => done(null, !!req.headers.origin && env.CORS_ORIGINS.includes(req.headers.origin)),
        maxHttpBufferSize: 10000,
        cors: {
            origin: env.CORS_ORIGINS,
            credentials: true,
        },
    });

    io.use(async (socket: Socket, next) => {
        try {
            const session = await authenticateSession(socket.handshake.headers.cookie);
            socket.data.userId = session.user._id.toString();
            socket.data.role = session.user.appRole;
            socket.data.tokenHash = session.tokenHash;
            socket.data.expiresAt = session.expiresAt;
            next();
        } catch { next(new Error("Authentication required")); }
    });

    io.on("connection", (socket: AuthenticatedSocket) => {
        socket.join(`user:${socket.data.userId}`);
        socket.join(`session:${socket.data.tokenHash}`);
        const expire = setTimeout(() => socket.disconnect(true), Math.max(0, Math.min(2147483647, socket.data.expiresAt.getTime() - Date.now())));
        const revalidate = setInterval(async () => {
            try { await authenticateSession(socket.handshake.headers.cookie); }
            catch { socket.disconnect(true); }
        }, 15000);
        socket.on("disconnect", () => { clearTimeout(expire); clearInterval(revalidate); });

        let joinWindow = Date.now();
        let joinCount = 0;
        socket.on(events.projectJoin, async (projectId: string) => {
            if (Date.now() - joinWindow >= 60000) { joinWindow = Date.now(); joinCount = 0; }
            if (++joinCount > 30) { socket.emit("error", { message: "Too many room requests" }); return; }
            if (!projectId || typeof projectId !== "string" || !Types.ObjectId.isValid(projectId)) {
                socket.emit("error", { message: "Invalid project ID" });
                return;
            }

            try {
                await authenticateSession(socket.handshake.headers.cookie);
                const project = await Project.findById(projectId);

                if (!project || !project.getMemberRole(socket.data.userId)) {
                    socket.emit("error", { message: "Not authorized to join this project" });
                    return;
                }

                const roomName = `project:${projectId}`;
                // The UI views one project at a time. Archived rooms permit reads
                // only; every HTTP mutation still enforces active-project access.
                for (const room of socket.rooms) if (room.startsWith("project:") && room !== roomName) await socket.leave(room);
                if (!socket.rooms.has(roomName)) {
                    await socket.join(roomName);
                    socket.to(roomName).emit("user:joined", {
                        userId: socket.data.userId,
                        projectId,
                    });
                }
                socket.emit(events.projectJoined, { projectId });
            } catch {
                socket.emit("error", { message: "Unable to join project" });
            }
        });

        socket.on(events.projectLeave, (projectId: string) => {
            if (!projectId || typeof projectId !== "string") return;
            const roomName = `project:${projectId}`;
            if (socket.rooms.has(roomName)) {
                socket.leave(roomName);
                socket.to(roomName).emit("user:left", {
                    userId: socket.data.userId,
                    projectId,
                });
            }
        });
    });

    return io;
};

export const broadcastTaskUpdate = (
    io: SocketIOServer,
    projectId: string,
    task: unknown
): void => {
    const roomName = `project:${projectId}`;
    io.to(roomName).emit(events.taskUpdated, task);
};

export const broadcastTaskCreate = (
    io: SocketIOServer,
    projectId: string,
    task: unknown
): void => {
    const roomName = `project:${projectId}`;
    io.to(roomName).emit(events.taskCreated, task);
};

export const broadcastTaskDelete = (
    io: SocketIOServer,
    projectId: string,
    taskId: string
): void => {
    const roomName = `project:${projectId}`;
    io.to(roomName).emit(events.taskDeleted, { taskId });
};

export const broadcastMemberAdded = (
    io: SocketIOServer,
    projectId: string,
    member: unknown
): void => {
    io.to(`project:${projectId}`).emit(events.memberAdded, { projectId, member });
};

export const broadcastMemberRemoved = (
    io: SocketIOServer,
    projectId: string,
    userId: string
): void => {
    io.to(`project:${projectId}`).emit(events.memberRemoved, { projectId, userId });
    evictUserFromProject(io, projectId, userId).catch(console.error);
};

export const broadcastOwnershipTransferred = (
    io: SocketIOServer,
    projectId: string,
    newOwnerId: string
): void => {
    io.to(`project:${projectId}`).emit(events.ownershipTransferred, {
        projectId,
        newOwnerId,
    });
};

export const broadcastCommentCreated = (
    io: SocketIOServer,
    projectId: string,
    comment: unknown
): void => {
    io.to(`project:${projectId}`).emit(events.commentCreated, comment);
};

export const broadcastCommentDeleted = (
    io: SocketIOServer,
    projectId: string,
    commentId: string
): void => {
    io.to(`project:${projectId}`).emit(events.commentDeleted, { commentId });
};

export const broadcastActivityCreated = (
    io: SocketIOServer,
    projectId: string,
    activity: unknown
): void => {
    io.to(`project:${projectId}`).emit(events.activityCreated, activity);
};

export const evictUserFromProject = async (
    io: SocketIOServer,
    projectId: string,
    userId: string
): Promise<void> => {
    const sockets = await io.in(`user:${userId}`).fetchSockets();
    for (const socket of sockets) {
        await socket.leave(`project:${projectId}`);
        socket.emit(events.projectEvicted, { projectId });
    }
};
