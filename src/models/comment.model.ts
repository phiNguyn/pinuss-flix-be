import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  movieSlug: string;
  userId: Types.ObjectId;
  userName: string;
  userAvatar?: string;
  text: string;
  likes: number;
  parentId?: Types.ObjectId | null;
  rootId?: Types.ObjectId | null;
  replyToUserName?: string | null;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    movieSlug: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userAvatar: {
      type: String,
      default: '',
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    likes: {
      type: Number,
      default: 0,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    // Top-level comment of the whole thread. Null for root comments.
    // Every reply (including reply-to-reply) is flattened under the same rootId.
    rootId: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    // Denormalized name of the user being directly replied to (for "@name" display).
    replyToUserName: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
commentSchema.index({ movieSlug: 1, createdAt: -1 });
commentSchema.index({ parentId: 1, createdAt: 1 });
commentSchema.index({ rootId: 1, createdAt: 1 });

export const Comment = mongoose.model<IComment>('Comment', commentSchema);
