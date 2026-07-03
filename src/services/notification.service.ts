import {
  Notification,
  INotification,
  NotificationType,
  INotificationMetadata,
} from "../models/index.js";
import { Types } from "mongoose";

export interface CreateNotificationDto {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: INotificationMetadata;
}

export interface NotificationListResult {
  notifications: INotification[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

export class NotificationService {
  async create(data: CreateNotificationDto): Promise<INotification> {
    const notification = new Notification({
      userId: new Types.ObjectId(data.userId),
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      metadata: data.metadata,
      read: false,
    });

    return notification.save();
  }

  async notifyCommentReply(params: {
    recipientUserId: string;
    actorUserId: string;
    actorName: string;
    actorAvatar?: string;
    movieSlug: string;
    commentId: string;
    parentCommentId: string;
    replyPreview: string;
  }): Promise<INotification | null> {
    if (params.recipientUserId === params.actorUserId) {
      return null;
    }

    const preview =
      params.replyPreview.length > 80
        ? `${params.replyPreview.slice(0, 80)}...`
        : params.replyPreview;

    return this.create({
      userId: params.recipientUserId,
      type: NotificationType.COMMENT_REPLY,
      title: `${params.actorName} đã trả lời bình luận của bạn`,
      message: preview,
      link: `/phim/${params.movieSlug}`,
      metadata: {
        actorId: params.actorUserId,
        actorName: params.actorName,
        actorAvatar: params.actorAvatar,
        movieSlug: params.movieSlug,
        commentId: params.commentId,
        parentCommentId: params.parentCommentId,
      },
    });
  }

  async getByUserId(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      unreadOnly?: boolean;
    } = {},
  ): Promise<NotificationListResult> {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (unreadOnly) {
      filter.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        userId: new Types.ObjectId(userId),
        read: false,
      }),
    ]);

    return { notifications, total, page, limit, unreadCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Notification.countDocuments({
      userId: new Types.ObjectId(userId),
      read: false,
    });
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<INotification | null> {
    if (!Types.ObjectId.isValid(notificationId)) {
      return null;
    }

    return Notification.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { read: true } },
      { new: true },
    );
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await Notification.updateMany(
      {
        userId: new Types.ObjectId(userId),
        read: false,
      },
      { $set: { read: true } },
    );

    return result.modifiedCount;
  }
}

export const notificationService = new NotificationService();
