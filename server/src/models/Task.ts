import { Schema, Document, Types } from "mongoose";
import mongoose from "mongoose";

export enum TaskStatus {
    TODO = "todo",
    IN_PROGRESS = "in_progress",
    DONE = "done"
}

export enum TaskPriority {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high"
}
export interface ITask extends Document {
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  project: Types.ObjectId;
  assignee?: Types.ObjectId | null | undefined;
  createdBy: Types.ObjectId;
  completedAt?: Date | undefined;
  dueDate?: Date | null | undefined;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}



const TaskSchema = new Schema<ITask>(
  {
    title: {
      type: String,
      required: [true, "Task title is required"],
      trim: true,
      minlength: [2, "Title must be at least 2 characters"],
      maxlength: [150, "Title cannot exceed 150 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    // This is the field Socket.io will broadcast on change
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.TODO,
    },
    priority: {
      type: String,
      enum: Object.values(TaskPriority),
      default: TaskPriority.MEDIUM,
    },
    // A task always belongs to a project
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: [true, "Task must belong to a project"],
    },
    // Optional — task may not be assigned yet
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // Always track who created it
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedAt: {
        type: Date,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    optimisticConcurrency: true,
    timestamps: true, 
  }
);






TaskSchema.index({ assignee: 1 });

TaskSchema.index({ project: 1, isArchived: 1, status: 1 });
TaskSchema.index({ project: 1, isArchived: 1, createdAt: 1 });


export const Task = mongoose.model<ITask>("Task", TaskSchema);