import mongoose, { Schema, Document, Types } from 'mongoose';
import type { WatchHistorySource } from './watchHistory.model.js';

export interface IWatchSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: Types.ObjectId;
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  originName?: string;
  year?: number;
  source: WatchHistorySource;
  episodeSlug: string;
  episodeName?: string;
  watchedSeconds: number;
  progressStart?: number;
  progressEnd?: number;
  watchDate: string;
  startedAt: Date;
  endedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const watchSessionSchema = new Schema<IWatchSession>(
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
    originName: {
      type: String,
    },
    year: {
      type: Number,
    },
    source: {
      type: String,
      enum: ['ophim', 'phimapi', 'nguonc'],
      default: 'ophim',
    },
    episodeSlug: {
      type: String,
      required: true,
    },
    episodeName: {
      type: String,
    },
    watchedSeconds: {
      type: Number,
      required: true,
      min: 1,
    },
    progressStart: {
      type: Number,
      min: 0,
    },
    progressEnd: {
      type: Number,
      min: 0,
    },
    watchDate: {
      type: String,
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    endedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

watchSessionSchema.index({ userId: 1, watchDate: 1 });
watchSessionSchema.index({ userId: 1, endedAt: -1 });
watchSessionSchema.index({ userId: 1, movieId: 1, episodeSlug: 1, watchDate: 1 });

export const WatchSession = mongoose.model<IWatchSession>('WatchSession', watchSessionSchema);
