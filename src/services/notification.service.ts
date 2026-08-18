import {
  Notification,
  INotification,
  NotificationType,
  INotificationMetadata,
} from "../models/index.js";
import { Types } from "mongoose";

export interface CreateNotificationDto {
  userId?: string;
  recipients: string[];
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: INotificationMetadata;
}

export interface NotificationResponse {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  userId?: string;
  read: boolean;
  metadata?: INotificationMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationListResult {
  notifications: NotificationResponse[];
  total: number;
  page: number;
  limit: number;
  unreadCount: number;
}

export class NotificationService {
  async create(data: CreateNotificationDto): Promise<INotification> {
    if (!data.recipients || data.recipients.length === 0) {
      throw new Error("At least one recipient is required");
    }

    for (const recipient of data.recipients) {
      if (!Types.ObjectId.isValid(recipient)) {
        throw new Error(`Invalid recipient ID: ${recipient}`);
      }
    }

    const notification = new Notification({
      type: data.type,
      title: data.title,
      message: data.message,
      link: data.link,
      metadata: data.metadata,
      userId: new Types.ObjectId(data.recipients[0]),
      recipients: data.recipients.map((id) => new Types.ObjectId(id)),
      readBy: [],
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

    const notification = new Notification({
      userId: new Types.ObjectId(params.recipientUserId),
      recipients: [new Types.ObjectId(params.recipientUserId)],
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
      readBy: [],
    });

    return notification.save();
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
    const userObjectId = new Types.ObjectId(userId);

    const filter: Record<string, unknown> = {
      $or: [{ userId: userObjectId }, { recipients: userObjectId }],
    };

    if (unreadOnly) {
      filter["readBy.userId"] = { $ne: userObjectId };
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
      Notification.countDocuments({
        $or: [{ userId: userObjectId }, { recipients: userObjectId }],
        "readBy.userId": { $ne: userObjectId },
      }),
    ]);

    const transformed: NotificationResponse[] = notifications.map((n) => {
      const isRead = n.readBy.some((r) => r.userId.toString() === userId);
      const obj = n.toObject();
      return {
        _id: obj._id.toString(),
        type: obj.type,
        title: obj.title,
        message: obj.message,
        link: obj.link,
        userId: obj.userId?.toString(),
        metadata: obj.metadata,
        createdAt: obj.createdAt.toISOString(),
        updatedAt: obj.updatedAt.toISOString(),
        read: isRead,
      };
    });

    return { notifications: transformed, total, page, limit, unreadCount };
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);
    return Notification.countDocuments({
      $or: [{ userId: userObjectId }, { recipients: userObjectId }],
      "readBy.userId": { $ne: userObjectId },
    });
  }

  async markAsRead(
    userId: string,
    notificationId: string,
  ): Promise<INotification | null> {
    if (!Types.ObjectId.isValid(notificationId)) {
      return null;
    }

    const notification = await Notification.findOne({
      _id: new Types.ObjectId(notificationId),
      $or: [
        { userId: new Types.ObjectId(userId) },
        { recipients: new Types.ObjectId(userId) },
      ],
    });

    if (!notification) {
      return null;
    }

    const alreadyRead = notification.readBy.some(
      (r) => r.userId.toString() === userId,
    );

    if (!alreadyRead) {
      notification.readBy.push({
        userId: new Types.ObjectId(userId),
        readAt: new Date(),
      });
      await notification.save();
    }

    return notification;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);

    const updateResult = await Notification.updateMany(
      {
        $or: [{ userId: userObjectId }, { recipients: userObjectId }],
        "readBy.userId": { $ne: userObjectId },
      },
      {
        $push: {
          readBy: {
            userId: userObjectId,
            readAt: new Date(),
          },
        },
      },
    );

    return updateResult.modifiedCount;
  }

  async getAll(
    options: {
      page?: number;
      limit?: number;
      type?: NotificationType;
    } = {},
  ): Promise<{
    notifications: INotification[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, type } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (type) {
      filter.type = type;
    }

    const [notifications, total] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email avatar")
        .populate("recipients", "name email avatar")
        .populate("readBy.userId", "name email avatar"),
      Notification.countDocuments(filter),
    ]);

    return { notifications, total, page, limit };
  }

  async getById(notificationId: string): Promise<INotification | null> {
    if (!Types.ObjectId.isValid(notificationId)) {
      return null;
    }

    return Notification.findById(notificationId)
      .populate("recipients", "name email avatar")
      .populate("readBy.userId", "name email avatar");
  }
}

export const notificationService = new NotificationService();
