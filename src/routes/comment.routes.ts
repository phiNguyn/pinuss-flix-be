import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Comment, User, IComment } from "../models/index.js";
import { notificationService } from "../services/index.js";
import mongoose from "mongoose";

export async function commentRoutes(app: FastifyInstance): Promise<void> {
  // Create comment
  app.post(
    "/",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { movieSlug, text, parentId } = request.body as {
          movieSlug: string;
          text: string;
          parentId?: string | null;
        };

        const user = (request as any).user;

        let parentComment: IComment | null = null;
        // rootId = top-level comment of the thread. Null for root comments.
        // A reply to a root -> rootId = root._id.
        // A reply to a reply -> rootId = parent.rootId (same top-level thread).
        let rootId: mongoose.Types.ObjectId | null = null;
        if (parentId) {
          parentComment = await Comment.findById(parentId);
          if (!parentComment) {
            return reply.status(404).send({
              error: "Not Found",
              message: "Parent comment not found",
            });
          }
          rootId =
            (parentComment.rootId as mongoose.Types.ObjectId | null) ??
            parentComment._id;
        }

        // Fetch user from DB to get accurate name
        const userDoc = await User.findById(user.userId).select("name avatar");
        const userName = userDoc?.name || "Anonymous";
        const userAvatar = userDoc?.avatar || "";

        const comment = new Comment({
          movieSlug,
          userId: new mongoose.Types.ObjectId(user.userId),
          userName,
          userAvatar,
          text,
          parentId: parentId ? new mongoose.Types.ObjectId(parentId) : null,
          rootId,
          replyToUserName: parentComment?.userName ?? null,
          likes: 0,
        });

        await comment.save();

        if (parentComment) {
          notificationService
            .notifyCommentReply({
              recipientUserId: parentComment.userId.toString(),
              actorUserId: user.userId,
              actorName: userName,
              actorAvatar: userAvatar,
              movieSlug,
              commentId: comment._id.toString(),
              parentCommentId: parentId!,
              replyPreview: text,
            })
            .catch((err) =>
              console.error("Failed to send comment reply notification:", err),
            );
        }

        return reply.status(201).send({
          success: true,
          data: comment,
        });
      } catch (error: any) {
        if (error.name === "ValidationError") {
          return reply.status(400).send({
            error: "Validation Error",
            message: error.message,
          });
        }
        console.error("Create comment error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to create comment",
        });
      }
    },
  );

  // Get comments for a movie
  app.get(
    "/movie/:movieSlug",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { movieSlug } = request.params as { movieSlug: string };
        const {
          page = "1",
          limit = "20",
          parentId,
          rootId,
        } = request.query as {
          page?: string;
          limit?: string;
          parentId?: string;
          rootId?: string;
        };

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
        const skip = (pageNum - 1) * limitNum;

        const query: any = { movieSlug, isDeleted: false };

        // rootId takes precedence: fetch the whole flattened thread (all replies
        // of a top-level comment, including reply-to-reply), oldest first.
        // Otherwise filter by parentId (parentId=null => root comments).
        let sortOrder: 1 | -1 = -1;
        if (rootId) {
          query.rootId = new mongoose.Types.ObjectId(rootId);
          sortOrder = 1;
        } else if (parentId === "null" || parentId === "") {
          query.parentId = null;
        } else if (parentId) {
          query.parentId = new mongoose.Types.ObjectId(parentId);
        }

        const [comments, total] = await Promise.all([
          Comment.find(query)
            .sort({ createdAt: sortOrder })
            .skip(skip)
            .limit(limitNum)
            .lean(),
          Comment.countDocuments(query),
        ]);

        // Reply count = size of the whole flattened thread (grouped by rootId),
        // so a root comment reflects replies AND reply-to-reply.
        const commentIds = comments.map((c) => c._id);
        const replyCounts = await Comment.aggregate([
          { $match: { rootId: { $in: commentIds }, isDeleted: false } },
          { $group: { _id: "$rootId", count: { $sum: 1 } } },
        ]);

        const replyCountMap = new Map(
          replyCounts.map((r) => [r._id.toString(), r.count]),
        );

        const commentsWithReplyCount = comments.map((comment) => ({
          ...comment,
          replyCount: replyCountMap.get(comment._id.toString()) || 0,
        }));

        return reply.send({
          success: true,
          data: commentsWithReplyCount,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
          },
        });
      } catch (error: any) {
        console.error("Get comments error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to fetch comments",
        });
      }
    },
  );

  // Like a comment
  app.post(
    "/:commentId/like",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { commentId } = request.params as { commentId: string };

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
          return reply.status(400).send({
            error: "Validation Error",
            message: "Invalid comment ID",
          });
        }

        const comment = await Comment.findByIdAndUpdate(
          commentId,
          { $inc: { likes: 1 } },
          { new: true },
        );

        if (!comment || comment.isDeleted) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Comment not found",
          });
        }

        return reply.send({
          success: true,
          data: { likes: comment.likes },
        });
      } catch (error: any) {
        console.error("Like comment error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to like comment",
        });
      }
    },
  );

  // Delete comment (soft delete)
  app.delete(
    "/:commentId",
    { preHandler: [app.authenticate] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { commentId } = request.params as { commentId: string };
        const user = (request as any).user;

        if (!mongoose.Types.ObjectId.isValid(commentId)) {
          return reply.status(400).send({
            error: "Validation Error",
            message: "Invalid comment ID",
          });
        }

        const comment = await Comment.findById(commentId);

        if (!comment || comment.isDeleted) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Comment not found",
          });
        }

        // Check ownership
        if (comment.userId.toString() !== user.userId) {
          return reply.status(403).send({
            error: "Forbidden",
            message: "You can only delete your own comments",
          });
        }

        comment.isDeleted = true;
        await comment.save();

        return reply.send({
          success: true,
          message: "Comment deleted",
        });
      } catch (error: any) {
        console.error("Delete comment error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to delete comment",
        });
      }
    },
  );
}
