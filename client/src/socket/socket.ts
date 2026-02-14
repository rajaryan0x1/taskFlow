import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../stores/authStore";

let socket: Socket | null = null;

export const initSocket = () => {
    const { token } = useAuthStore.getState();

    if (!token) {
        throw new Error("Cannot initialize socket without authentication token");
    }

    if (socket?.connected) {
        return socket;
    }
    socket = io("http://localhost:3000", {
        auth: {
            token,
        },
        autoConnect: true,
    });

    socket.on("connect", () => {
        console.log("[socket.io] connected: ", socket?.id);
    })

    socket.on("disconnect", (reason) => {
        console.log("[socket.io] disconnected: ", reason);

    });

    socket.on("connect_error", (error) => {
        console.error("[socket.io] connection error: ", error.message);
    });

    return socket;


}


export const getSocket = (): Socket | null => {
    return socket;
};

// Disconnect socket
export const disconnectSocket = (): void => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

// Join project room

export const joinProject = (projectId: string): void => {
    const sock = getSocket();
    if (sock?.connected) {
        sock.emit("project:join", { projectId });
        console.log(`[socket.io] Joined project room: ${projectId}`);
    }
}

export const leaveProject = (projectId: string): void => {
    const sock = getSocket();
    if (sock?.connected) {
        sock.emit("project:leave", projectId);
        console.log(`[socket.io] Left project room: ${projectId}`);
    }
};

export default { initSocket, getSocket, disconnectSocket, joinProject, leaveProject };