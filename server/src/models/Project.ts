import { Document, Schema, Types  } from "mongoose";
import mongoose from "mongoose";
import { ProjectRole } from "../types/roles.js";

export interface IProjectMember {
    user: Types.ObjectId;
    role: ProjectRole;
    joinedAt: Date;
}

export interface IProject extends Document {
    name: string;
    description?: string;
    owner: Types.ObjectId;
    members: IProjectMember[];
    isArchived: boolean;
    createdAt: Date;
    updatedAt: Date;

    // Instance method
    getMemberRole(userId: string | Types.ObjectId): ProjectRole | null;
}



const ProjectMemberSchema = new Schema<IProjectMember>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ProjectRole),
      required: true,
      default: ProjectRole.MEMBER,
    },
    joinedAt: {
      type: Date,
      default: () => new Date(),
    },
  },
  { _id: false } // No separate _id per member entry — cleaner queries
);

//  Project Schema

const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Project name must be at least 2 characters"],
      maxlength: [100, "Project name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    // Denormalized at top level for fast ownership checks
    // without scanning the members array every time
    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [ProjectMemberSchema],
      default: [],
      validate: {
        // Enforce exactly one owner at all times
        validator(members: IProjectMember[]) {
          const owners = members.filter((m) => m.role === ProjectRole.OWNER);
          return owners.length === 1;
        },
        message: "A project must have exactly one owner",
      },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // auto adds createdAt + updatedAt
  }
);

//  Indexes 
// "Give me all projects this user belongs to" — hits on every dashboard load
ProjectSchema.index({ "members.user": 1 });
// Useful for ownership transfer and admin panel queries
ProjectSchema.index({ owner: 1 });

//  Instance Methods 

ProjectSchema.methods.getMemberRole = function (
  userId: string | Types.ObjectId
): ProjectRole | null {
  const userIdStr = userId.toString();
  const membership = this.members.find(
    (m: IProjectMember) => m.user.toString() === userIdStr
  );
  // Returns null if user is not a member — middleware uses this to 403
  return membership?.role ?? null;
};

// Model 

export const Project = mongoose.model<IProject>("Project", ProjectSchema);