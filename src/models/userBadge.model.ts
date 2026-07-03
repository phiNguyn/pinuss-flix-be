import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUserBadge extends Document {
  userId: Types.ObjectId;
  badgeId: string;
  earnedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userBadgeSchema = new Schema<IUserBadge>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    badgeId: {
      type: String,
      required: true,
      trim: true,
    },
    earnedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

userBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

export const UserBadge = mongoose.model<IUserBadge>(
  "UserBadge",
  userBadgeSchema,
);
