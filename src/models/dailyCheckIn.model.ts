import mongoose, { Schema, Document, Types } from "mongoose";

export interface IDailyCheckIn extends Document {
  userId: Types.ObjectId;
  date: string;
  createdAt: Date;
  updatedAt: Date;
}

const dailyCheckInSchema = new Schema<IDailyCheckIn>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
  },
  {
    timestamps: true,
  },
);

dailyCheckInSchema.index({ userId: 1, date: 1 }, { unique: true });
dailyCheckInSchema.index({ userId: 1, date: -1 });

export const DailyCheckIn = mongoose.model<IDailyCheckIn>(
  "DailyCheckIn",
  dailyCheckInSchema,
);
