import mongoose, { Schema, Document } from "mongoose";

export enum FeedbackCategory {
  BUG_REPORT = "bug_report",       // Báo lỗi
  FEATURE_REQUEST = "feature_request", // Đề xuất tính năng
  IMPROVEMENT = "improvement",       // Cải thiện
  CONTENT_REQUEST = "content_request", // Yêu cầu thêm nội dung
  OTHER = "other",                  // Khác
}

export enum FeedbackStatus {
  PENDING = "pending",       // Chờ xử lý
  IN_PROGRESS = "in_progress", // Đang xử lý
  RESOLVED = "resolved",     // Đã xử lý
  REJECTED = "rejected",     // Từ chối
}

export interface IFeedback extends Document {
  userId?: mongoose.Types.ObjectId;  // Nullable for anonymous feedback
  sessionId?: string;                 // For anonymous users
  email?: string;                     // Contact email (optional)
  category: FeedbackCategory;
  subject: string;                    // Tiêu đề ngắn gọn
  content: string;                    // Nội dung chi tiết
  status: FeedbackStatus;
  priority: "low" | "medium" | "high";
  adminReply?: string;                // Phản hồi từ admin
  repliedBy?: mongoose.Types.ObjectId;
  repliedAt?: Date;
  metadata?: {
    userAgent?: string;
    pageUrl?: string;
    movieSlug?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    sessionId: {
      type: String,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    category: {
      type: String,
      required: true,
      enum: Object.values(FeedbackCategory),
      default: FeedbackCategory.OTHER,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    status: {
      type: String,
      required: true,
      enum: Object.values(FeedbackStatus),
      default: FeedbackStatus.PENDING,
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    adminReply: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    repliedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    repliedAt: {
      type: Date,
    },
    metadata: {
      userAgent: String,
      pageUrl: String,
      movieSlug: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
feedbackSchema.index({ createdAt: -1 });
feedbackSchema.index({ status: 1, priority: -1 });
feedbackSchema.index({ userId: 1, createdAt: -1 });

export const Feedback = mongoose.model<IFeedback>("Feedback", feedbackSchema);
