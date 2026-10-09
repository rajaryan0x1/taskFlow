import { z } from "zod";
import { parseInput, booleanQuery } from "../utils/input.js";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import { Notification } from "../models/Notification.js";
import { ApiError } from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getNotifications = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { page, limit, read } = parseInput(z.object({
    page: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(10000)).optional().default(1),
    limit: z.string().regex(/^\d+$/).transform(Number).pipe(z.number().int().min(1).max(50)).optional().default(20),
    read: booleanQuery,
  }), req.query);
  const filter: { user: string; read?: boolean } = { user: req.user!.id };

  if (read === "true") filter.read = true;
  if (read === "false") filter.read = false;

  const [notifications, total, unread] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit),
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
