import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IWatchHistory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId;
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  progress: number;
  duration: number;
  completed: boolean;
  watchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const watchHistorySchema = new Schema<IWatchHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    movieId: {
      type: String,
      required: true,
    },
    movieTitle: {
      type: String,
      required: true,
    },
    moviePoster: {
      type: String,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    watchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

watchHistorySchema.index({ userId: 1, movieId: 1 }, { unique: true });
watchHistorySchema.index({ userId: 1, watchedAt: -1 });

export const WatchHistory = mongoose.model<IWatchHistory>('WatchHistory', watchHistorySchema);
