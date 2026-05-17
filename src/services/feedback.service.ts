import { Feedback, IFeedback, FeedbackCategory, FeedbackStatus } from "../models/index.js";
import { Types } from "mongoose";

export interface CreateFeedbackDto {
  category: FeedbackCategory;
  subject: string;
  content: string;
  email?: string;
  sessionId?: string;
  userId?: string;
  metadata?: {
    userAgent?: string;
    pageUrl?: string;
    movieSlug?: string;
  };
}

export interface FeedbackListResult {
  feedback: IFeedback[];
  total: number;
  page: number;
  limit: number;
}

export class FeedbackService {
  /**
   * Create a new feedback (public endpoint)
   */
  async create(data: CreateFeedbackDto): Promise<IFeedback> {
    const feedback = new Feedback({
      userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
      sessionId: data.sessionId,
      email: data.email,
      category: data.category,
      subject: data.subject,
      content: data.content,
      status: FeedbackStatus.PENDING,
      priority: "medium",
      metadata: data.metadata,
    });

    return feedback.save();
  }

  /**
   * Get paginated feedback list (admin only)
   */
  async getList(
    options: {
      page?: number;
      limit?: number;
      status?: FeedbackStatus;
      category?: FeedbackCategory;
      priority?: "low" | "medium" | "high";
      search?: string;
    } = {}
  ): Promise<FeedbackListResult> {
    const { page = 1, limit = 20, status, category, priority, search } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.category = category;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (search) {
      filter.$or = [
        { subject: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [feedback, total] = await Promise.all([
      Feedback.find(filter)
        .populate("userId", "name email avatar")
        .populate("repliedBy", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Feedback.countDocuments(filter),
    ]);

    return { feedback, total, page, limit };
  }

  /**
   * Get feedback by ID (admin only)
   */
  async getById(id: string): Promise<IFeedback | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    return Feedback.findById(id)
      .populate("userId", "name email avatar")
      .populate("repliedBy", "name email");
  }

  /**
   * Update feedback status and add admin reply (admin only)
   */
  async reply(
    feedbackId: string,
    data: {
      status: FeedbackStatus;
      adminReply: string;
      priority?: "low" | "medium" | "high";
    },
    adminId: string
  ): Promise<IFeedback | null> {
    if (!Types.ObjectId.isValid(feedbackId)) {
      return null;
    }

    return Feedback.findByIdAndUpdate(
      feedbackId,
      {
        $set: {
          status: data.status,
          adminReply: data.adminReply,
          repliedBy: new Types.ObjectId(adminId),
          repliedAt: new Date(),
          priority: data.priority,
        },
      },
      { new: true }
    )
      .populate("userId", "name email avatar")
      .populate("repliedBy", "name email");
  }

  /**
   * Delete feedback (admin only)
   */
  async delete(id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      return false;
    }

    const result = await Feedback.findByIdAndDelete(id);
    return !!result;
  }

  /**
   * Get feedback statistics (admin only)
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    resolved: number;
    byCategory: Record<string, number>;
  }> {
    const [total, pending, inProgress, resolved, byCategoryResult] =
      await Promise.all([
        Feedback.countDocuments(),
        Feedback.countDocuments({ status: FeedbackStatus.PENDING }),
        Feedback.countDocuments({ status: FeedbackStatus.IN_PROGRESS }),
        Feedback.countDocuments({ status: FeedbackStatus.RESOLVED }),
        Feedback.aggregate([
          { $group: { _id: "$category", count: { $sum: 1 } } },
        ]),
      ]);

    const byCategory = byCategoryResult.reduce(
      (acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total,
      pending,
      inProgress,
      resolved,
      byCategory,
    };
  }
}

export const feedbackService = new FeedbackService();
