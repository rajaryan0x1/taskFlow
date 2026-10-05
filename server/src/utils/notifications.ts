import type { Server as SocketIOServer } from "socket.io";
import { Notification, type NotificationType } from "../models/Notification.js";

export const createNotification = async (
  io: SocketIOServer | undefined,
  userId: string,
  type: NotificationType,
  payload: Record<string, unknown>
): Promise<void> => {
  const notification = await Notification.create({ user: userId, type, payload });
  io?.to(`user:${userId}`).emit("notification:new", notification);
};
