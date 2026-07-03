import mongoose, { Schema, Document } from "mongoose";

export enum NotificationType {
  COMMENT_REPLY = "comment_reply",
  LEADERBOARD_OVERTAKE = "leaderboard_overtake",
  RANK_CHANGE = "rank_change",
  SYSTEM = "system",
  EVENT = "event",
}

export interface INotificationMetadata {
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  movieSlug?: string;
  movieTitle?: string;
  commentId?: string;
  parentCommentId?: string;
  rank?: number;
  previousRank?: number;
  eventId?: string;
}

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  metadata?: INotificationMetadata;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: Object.values(NotificationType),
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    link: {
      type: String,
      trim: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    metadata: {
      actorId: String,
      actorName: String,
      actorAvatar: String,
      movieSlug: String,
      movieTitle: String,
      commentId: String,
      parentCommentId: String,
      rank: Number,
      previousRank: Number,
      eventId: String,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);
