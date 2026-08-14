import mongoose, { Schema, Document } from "mongoose";

export enum Provider {
  LOCAL = "local",
  GOOGLE = "google",
}

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  provider: Provider;
  googleId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider === Provider.LOCAL;
      },
    },
    name: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
    },
    bio: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.USER,
    },
    provider: {
      type: String,
      enum: Object.values(Provider),
      default: Provider.LOCAL,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Index for role-based queries
userSchema.index({ role: 1 });
// Index for lastLogin queries
userSchema.index({ lastLogin: -1 });

export const User = mongoose.model<IUser>("User", userSchema);
