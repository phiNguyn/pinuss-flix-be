import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { Comment, User } from "../models/index.js";
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

        // Validate parentId if provided
        if (parentId) {
          const parentComment = await Comment.findById(parentId);
          if (!parentComment) {
            return reply.status(404).send({
              error: "Not Found",
              message: "Parent comment not found",
            });
          }
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
          parentId: parentId
            ? new mongoose.Types.ObjectId(parentId)
            : null,
          likes: 0,
        });

        await comment.save();

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
        const { page = "1", limit = "20", parentId } = request.query as {
          page?: string;
          limit?: string;
          parentId?: string;
        };

        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
        const skip = (pageNum - 1) * limitNum;

        const query: any = { movieSlug, isDeleted: false };

        // Filter by parentId
        if (parentId === "null" || parentId === "") {
          query.parentId = null;
        } else if (parentId) {
          query.parentId = new mongoose.Types.ObjectId(parentId);
        }

        const [comments, total] = await Promise.all([
          Comment.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum)
            .lean(),
          Comment.countDocuments(query),
        ]);

        // Get reply counts for each comment
        const commentIds = comments.map((c) => c._id);
        const replyCounts = await Comment.aggregate([
          { $match: { parentId: { $in: commentIds }, isDeleted: false } },
          { $group: { _id: "$parentId", count: { $sum: 1 } } },
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
