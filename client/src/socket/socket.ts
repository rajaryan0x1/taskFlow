import { events } from "@taskflow/contracts";
import { io, Socket } from "socket.io-client";
import { useAuthStore } from "../stores/authStore";

let socket: Socket | null = null;
let currentProjectId: string | null = null;

export const initSocket = (): Socket => {
  const { user } = useAuthStore.getState();

  if (!user) {
    throw new Error("Cannot initialize socket without a signed-in user");
  }

  if (socket?.connected) {
    return socket;
  }

  if (socket && !socket.connected) {
    socket.connect();
    return socket;
  }

  socket = io(import.meta.env.VITE_SOCKET_URL ?? "http://localhost:5000", {
    withCredentials: true,
    autoConnect: true,
  });

  socket.on("connect", () => {
    console.log("[socket.io] connected:", socket?.id);
    if (currentProjectId) {
      socket?.emit(events.projectJoin, currentProjectId);
    }
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
  currentProjectId = null;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinProject = (projectId: string): void => {
  currentProjectId = projectId;
  const sock = getSocket();
  if (sock?.connected) {
    sock.emit(events.projectJoin, projectId);
  }
};

export const leaveProject = (projectId: string): void => {
  if (currentProjectId === projectId) {
    currentProjectId = null;
  }
  const sock = getSocket();
  if (sock?.connected) {
    sock.emit(events.projectLeave, projectId);
  }
};

export default { initSocket, getSocket, disconnectSocket, joinProject, leaveProject };