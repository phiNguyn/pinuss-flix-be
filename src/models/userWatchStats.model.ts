import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUserWatchStats extends Document {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId;
  totalWatchSeconds: number;
  weeklyWatchSeconds: number;
  monthlyWatchSeconds: number;
  weekStartDate: string;
  monthKey: string;
  lastWatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userWatchStatsSchema = new Schema<IUserWatchStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    totalWatchSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    weeklyWatchSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    monthlyWatchSeconds: {
      type: Number,
      default: 0,
      min: 0,
    },
    weekStartDate: {
      type: String,
      required: true,
    },
    monthKey: {
      type: String,
      required: true,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

userWatchStatsSchema.index({ totalWatchSeconds: -1 });
userWatchStatsSchema.index({ weeklyWatchSeconds: -1 });
userWatchStatsSchema.index({ monthlyWatchSeconds: -1 });

export const UserWatchStats = mongoose.model<IUserWatchStats>(
  'UserWatchStats',
  userWatchStatsSchema,
);
