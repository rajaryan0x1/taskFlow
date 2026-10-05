import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Notification } from "../models/Notification.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
  const filter: { user: string; read?: boolean } = { user: req.user!.id };

  if (req.query.read === "true") filter.read = true;
  if (req.query.read === "false") filter.read = false;

  const [notifications, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ user: req.user!.id, read: false }),
  ]);

  res.status(200).json({
    success: true,
    data: notifications,
    pagination: { page, limit, total, pages: Math.ceil(total / limit), unread },
  });
});

export const markNotificationRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id || typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid notification ID");
  }

  const notification = await Notification.findOneAndUpdate(
    { _id: id, user: req.user!.id },
    { read: true },
    { new: true }
  );
  if (!notification) throw ApiError.notFound("Notification not found");

  res.status(200).json({ success: true, data: notification });
});

export const markAllNotificationsRead = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  await Notification.updateMany({ user: req.user!.id, read: false }, { read: true });
  res.status(200).json({ success: true, message: "Notifications marked as read" });
});

export const deleteNotification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id || typeof id !== "string" || !Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("Invalid notification ID");
  }

  const notification = await Notification.findOneAndDelete({ _id: id, user: req.user!.id });
  if (!notification) throw ApiError.notFound("Notification not found");

  res.status(200).json({ success: true, message: "Notification deleted" });
});
