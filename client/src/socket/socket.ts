import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../stores/authStore";

let socket: Socket | null = null;

export const initSocket = (): Socket => {
  const { token } = useAuthStore.getState();

  if (!token) {
    throw new Error("Cannot initialize socket without authentication token");
  }

  if (socket?.connected) {
    return socket;
  }

  if (socket && !socket.connected) {
    socket.auth = { token };
    socket.connect();
    return socket;
  }

  socket = io("http://localhost:5000", {
    auth: {
      token,
    },
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("[socket.io] connected:", socket?.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[socket.io] disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[socket.io] connection error:", error.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinProject = (projectId: string): void => {
  const sock = getSocket();
  if (sock?.connected) {
    sock.emit("project:join", projectId);
  } else {
    sock?.once("connect", () => {
      sock.emit("project:join", projectId);
    });
  }
};

export const leaveProject = (projectId: string): void => {
  const sock = getSocket();
  if (sock?.connected) {
    sock.emit("project:leave", projectId);
  }
};

export default { initSocket, getSocket, disconnectSocket, joinProject, leaveProject };