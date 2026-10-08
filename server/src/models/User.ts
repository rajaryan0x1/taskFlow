import mongoose, { Document, Schema } from "mongoose";

// Interface 
export interface IUser extends Document {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  isDisabled: boolean;
  password?: string;
  googleId?: string;
  authProvider: "local" | "google";
  appRole: "app_admin" | "user";
  createdAt: Date;
  updatedAt: Date;
}

// Schema 
const UserSchema = new Schema<IUser>(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: 2,
      maxlength: 30,
    },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 20,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    isDisabled: { type: Boolean, default: false },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    appRole: {
      type: String,
      enum: ["app_admin", "user"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>("User", UserSchema);