import mongoose, { Document, Schema, Types } from "mongoose";

export type NotificationType = "task_assigned" | "comment_mention" | "due_soon" | "member_invited";

export interface INotification extends Document {
  user: Types.ObjectId;
  type: NotificationType;
  payload: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: ["task_assigned", "comment_mention", "due_soon", "member_invited"],
      required: true,
    },
    payload: { type: Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Notification = mongoose.model<INotification>("Notification", NotificationSchema);
