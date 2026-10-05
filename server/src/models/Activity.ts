import mongoose, { Document, Schema, Types } from "mongoose";

export type ActivityType = "created" | "status_changed" | "assigned" | "commented" | "updated" | "priority_changed" | "due_date_changed" | "archived" | "restored" | "comment_deleted";

export interface IActivity extends Document {
  project: Types.ObjectId;
  task: Types.ObjectId;
  actor: Types.ObjectId;
  type: ActivityType;
  meta: Record<string, unknown>;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    project: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    task: { type: Schema.Types.ObjectId, ref: "Task", required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["created", "status_changed", "assigned", "commented", "updated", "priority_changed", "due_date_changed", "archived", "restored", "comment_deleted"],
      required: true,
    },
    meta: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ActivitySchema.index({ task: 1, createdAt: -1 });

export const Activity = mongoose.model<IActivity>("Activity", ActivitySchema);
