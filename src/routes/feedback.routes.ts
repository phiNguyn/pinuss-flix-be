import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { feedbackService } from "../services/index.js";
import { adminService } from "../services/index.js";
import { FeedbackCategory, FeedbackStatus } from "../models/index.js";
import { z } from "zod";

// Validation schemas for public endpoints
const createFeedbackSchema = z.object({
  category: z.enum(["bug_report", "feature_request", "improvement", "content_request", "other"]),
  subject: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  email: z.string().email().optional(),
});

// Validation schemas for admin endpoints
const feedbackListQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  status: z.enum(["pending", "in_progress", "resolved", "rejected"]).optional(),
  category: z.enum(["bug_report", "feature_request", "improvement", "content_request", "other"]).optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  search: z.string().optional(),
});

const replyFeedbackSchema = z.object({
  status: z.enum(["pending", "in_progress", "resolved", "rejected"]),
  adminReply: z.string().min(1).max(5000),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

// Admin guard middleware for feedback routes
async function adminGuard(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token không hợp lệ",
      });
    }

    const decoded = await (request.server as any).jwt.verify(
      authHeader.replace("Bearer ", "")
    );

    if (!decoded?.userId) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token không hợp lệ",
      });
    }

    const { isAdmin, user } = await adminService.verifyAdmin(decoded.userId);

    if (!isAdmin) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Bạn không có quyền truy cập trang này",
      });
    }

    (request as any).adminUser = user;
    (request as any).adminId = decoded.userId;
  } catch (error) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
}

export async function feedbackRoutes(app: FastifyInstance) {
  // ========== PUBLIC ENDPOINTS ==========

  /**
   * POST /api/v1/feedback - Create new feedback
   */
  app.post(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createFeedbackSchema.parse(request.body);

        // Try to get user ID if logged in
        let userId: string | undefined;
        try {
          const authHeader = request.headers.authorization;
          if (authHeader?.startsWith("Bearer ")) {
            const decoded = await (request.server as any).jwt.verify(
              authHeader.replace("Bearer ", "")
            );
            userId = decoded.userId;
          }
        } catch {
          // User not authenticated, that's fine
        }

        // Get session ID for anonymous tracking
        const sessionId = request.headers["x-session-id"] as string | undefined;

        const feedback = await feedbackService.create({
          category: body.category as FeedbackCategory,
          subject: body.subject,
          content: body.content,
          email: body.email,
          userId,
          sessionId,
          metadata: {
            userAgent: request.headers["user-agent"],
            pageUrl: request.headers["referer"] as string,
          },
        });

        return reply.status(201).send({
          success: true,
          message: "Cảm ơn bạn đã phản hồi! Chúng tôi sẽ xem xét và cải thiện sớm nhất có thể.",
          data: {
            id: feedback._id,
            category: feedback.category,
            subject: feedback.subject,
          },
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Create feedback error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể gửi phản hồi",
        });
      }
    }
  );

  // ========== PROTECTED ADMIN ENDPOINTS ==========

  // Apply admin guard to all routes below this line
  app.addHook("preHandler", adminGuard);

  /**
   * GET /api/v1/feedback - Get paginated feedback list (admin only)
   */
  app.get(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = feedbackListQuerySchema.parse(request.query);

        const result = await feedbackService.getList(query as any);

        return reply.send({
          success: true,
          data: result.feedback,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / result.limit),
          },
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Get feedback list error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy danh sách phản hồi",
        });
      }
    }
  );

  /**
   * GET /api/v1/feedback/stats - Get feedback statistics (admin only)
   */
  app.get(
    "/stats",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const stats = await feedbackService.getStats();

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("Get feedback stats error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy thống kê",
        });
      }
    }
  );

  /**
   * GET /api/v1/feedback/:id - Get feedback detail (admin only)
   */
  app.get(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const feedback = await feedbackService.getById(id);

        if (!feedback) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Phản hồi không tồn tại",
          });
        }

        return reply.send({
          success: true,
          data: feedback,
        });
      } catch (error) {
        console.error("Get feedback detail error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy chi tiết phản hồi",
        });
      }
    }
  );

  /**
   * PATCH /api/v1/feedback/:id/reply - Reply to feedback (admin only)
   */
  app.patch(
    "/:id/reply",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const body = replyFeedbackSchema.parse(request.body);
        const adminId = (request as any).adminId;

        const feedback = await feedbackService.reply(
          id,
          {
            status: body.status as FeedbackStatus,
            adminReply: body.adminReply,
            priority: body.priority,
          },
          adminId
        );

        if (!feedback) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Phản hồi không tồn tại",
          });
        }

        return reply.send({
          success: true,
          message: "Đã gửi phản hồi",
          data: feedback,
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Reply feedback error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể gửi phản hồi",
        });
      }
    }
  );

  /**
   * DELETE /api/v1/feedback/:id - Delete feedback (admin only)
   */
  app.delete(
    "/:id",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const success = await feedbackService.delete(id);

        if (!success) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Phản hồi không tồn tại",
          });
        }

        return reply.send({
          success: true,
          message: "Đã xóa phản hồi",
        });
      } catch (error) {
        console.error("Delete feedback error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể xóa phản hồi",
        });
      }
    }
  );
}
