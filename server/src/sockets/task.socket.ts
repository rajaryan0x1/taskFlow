// Socket logic for task
import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { Project } from "../models/Project.js";

// authenticated socket 

interface AuthenticatedSocket extends Socket {
    data: {
        userId: string;
        role: "app_admin" | "user";
    };
}

// initilize socketIO 

export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: "*",
            credentials: true,

        },

    })


    // authenticated middleware
    io.use((socket: Socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) {
            return next(new Error("Authentication error: No token provided"));
        }

        try {
            const decoded = jwt.verify(token, env.JWT_SECRET) as {
                sub: string;
                role: "app_admin" | "user";
            }

            if (!decoded?.sub || !decoded?.role) {
                return next(new Error("Authentication error: Invalid token payload"));


            }
            socket.data.userId = decoded.sub;
            socket.data.role = decoded.role;
            next();


        } catch (err) {
            return next(new Error("Authentication error: Invalid token"));
        }

    })

    // connection handling 
    io.on("connection", (socket: AuthenticatedSocket) => {
        console.log(`[socket.io] User connected: ${socket.data.userId}`);

        socket.on("project:join", (projectId: string) => {
            const roomName = `project:${projectId}`;
            console.log(`[socket.io] RECEIVED project:join event with projectId: ${projectId}`)
            socket.join(roomName);
            console.log(`[socket.io] User ${socket.data.userId} joined room: ${roomName}`);
            const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
             console.log(`[socket.io] Room ${roomName} now has ${socketsInRoom?.size || 0} socket(s)`);

            socket.to(roomName).emit("user:joined", {
                userId: socket.data.userId,
                projectId
            })
        });


        // leave room

        socket.on("project:leave", (projectId: string) => {
            const roomName = `project:${projectId}`;
            socket.leave(roomName);
            console.log(
                `[socket.io] User ${socket.data.userId} left room ${roomName}`
            );

            socket.to(roomName).emit("user:left", {
                userId: socket.data.userId,
                projectId,
            });
        });

        // disconnect

        socket.on("disconnect", () => {
            console.log(`[socket.io] User disconnected: ${socket.data.userId}`);
        })




    })










    return io;
}


// broadcast helpers 

export const broadcastTaskUpdate = (
    io: SocketIOServer,
    projectId: string,
    task: any
): void => {
    const roomName = `project:${projectId}`;
    io.to(roomName).emit("task:updated", task);
    console.log(`[socket.io] Broadcasted task:updated to room ${roomName}`);
}



export const broadcastTaskCreate = (
    io: SocketIOServer,
    projectId: string,
    task: any
): void => {
    const roomName = `project:${projectId}`;
    const socketsInRoom = io.sockets.adapter.rooms.get(roomName);
    console.log(`[socket.io] Broadcasting task:created to ${roomName}, room has ${socketsInRoom?.size || 0} sockets`);
    io.to(roomName).emit("task:created", task);
    console.log(`[socket.io] Broadcasted task:created to room ${roomName}`);
}

export const broadcastTaskDelete = (
    io: SocketIOServer,
    projectId: string,
    taskId: string
): void => {
    const roomName = `project:${projectId}`;
    io.to(roomName).emit("task:deleted", { taskId });
    console.log(`[socket.io] Broadcasted task:deleted to room ${roomName}`);
}

