import mongoose, { Schema, Document } from "mongoose";

export type ViewAction =
  | "view"        // User click xem phim
  | "complete"    // User xem hết phim
  | "favorite"    // User thích phim
  | "unfavorite"  // User bỏ thích
  | "watchlist"   // User thêm vào watchlist
  | "unwatchlist" // User bỏ khỏi watchlist
  | "share";      // User share phim

export type ViewSource = "ophim" | "phimapi" | "nguonc";

export interface IMovieViewLog extends Document {
  movieId: string;
  sessionId?: string;   // Cho người chưa đăng nhập
  userId?: string;      // Cho người đã đăng nhập
  action: ViewAction;
  source: ViewSource;
  metadata?: {
    episodeSlug?: string;
    episodeName?: string;
    progress?: number;
    duration?: number;
  };
  viewedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const movieViewLogSchema = new Schema<IMovieViewLog>(
  {
    movieId: {
      type: String,
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ["view", "complete", "favorite", "unfavorite", "watchlist", "unwatchlist", "share"],
      index: true,
    },
    source: {
      type: String,
      required: true,
      enum: ["ophim", "phimapi", "nguonc"],
    },
    metadata: {
      episodeSlug: String,
      episodeName: String,
      progress: Number,
      duration: Number,
    },
    viewedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
movieViewLogSchema.index({ movieId: 1, viewedAt: -1 });
movieViewLogSchema.index({ action: 1, viewedAt: -1 });

// Index for merge operation (find by sessionId)
movieViewLogSchema.index({ sessionId: 1, userId: 1 });

export const MovieViewLog = mongoose.model<IMovieViewLog>("MovieViewLog", movieViewLogSchema);
