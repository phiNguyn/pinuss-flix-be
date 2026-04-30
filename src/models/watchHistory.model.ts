import mongoose, { Schema, Document, Types } from 'mongoose';

export type WatchHistorySource = 'ophim' | 'phimapi' | 'nguonc';

export interface IWatchHistory extends Document {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId;
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  // Additional movie info
  originName?: string;
  episodeCurrent?: string;
  year?: number;
  quality?: string;
  // Progress info
  progress: number;
  duration: number;
  completed: boolean;
  // Episode info
  currentEpSlug?: string;
  currentEpName?: string;
  // Source
  source: WatchHistorySource;
  watchedAt: Date;
  // Soft delete
  deletedAt: Date | null;
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
    // Additional movie info
    originName: {
      type: String,
    },
    episodeCurrent: {
      type: String,
    },
    year: {
      type: Number,
    },
    quality: {
      type: String,
    },
    // Progress info
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
    // Episode info
    currentEpSlug: {
      type: String,
    },
    currentEpName: {
      type: String,
    },
    // Source
    source: {
      type: String,
      enum: ['ophim', 'phimapi', 'nguonc'],
      default: 'ophim',
    },
    watchedAt: {
      type: Date,
      default: Date.now,
    },
    // Soft delete - null means not deleted
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

watchHistorySchema.index({ userId: 1, movieId: 1, deletedAt: 1 }, { unique: true });
watchHistorySchema.index({ userId: 1, watchedAt: -1 });
watchHistorySchema.index({ userId: 1, deletedAt: 1 });

export const WatchHistory = mongoose.model<IWatchHistory>('WatchHistory', watchHistorySchema);
