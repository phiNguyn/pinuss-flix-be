import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { notificationService, authenticate } from "../services/index.js";
import { z } from "zod";

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
  unreadOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export async function notificationRoutes(
  app: FastifyInstance,
): Promise<void> {
  app.addHook("onRequest", authenticate);

  app.get("/", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = listQuerySchema.parse(request.query);
      const result = await notificationService.getByUserId(
        request.user.userId,
        query,
      );

      return reply.send({
        success: true,
        data: result.notifications,
        unreadCount: result.unreadCount,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Validation Error",
          details: error.errors,
        });
      }
      console.error("Get notifications error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Không thể lấy thông báo",
      });
    }
  });

  app.get(
    "/unread-count",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const count = await notificationService.getUnreadCount(
          request.user.userId,
        );

        return reply.send({
          success: true,
          data: { count },
        });
      } catch (error) {
        console.error("Get unread count error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy số thông báo chưa đọc",
        });
      }
    },
  );

  app.patch(
    "/read-all",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const modifiedCount = await notificationService.markAllAsRead(
          request.user.userId,
        );

        return reply.send({
          success: true,
          message: "Đã đánh dấu tất cả là đã đọc",
          data: { modifiedCount },
        });
      } catch (error) {
        console.error("Mark all read error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể đánh dấu đã đọc",
        });
      }
    },
  );

  app.patch(
    "/:id/read",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };

        const notification = await notificationService.markAsRead(
          request.user.userId,
          id,
        );

        if (!notification) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Thông báo không tồn tại",
          });
        }

        return reply.send({
          success: true,
          data: notification,
        });
      } catch (error) {
        console.error("Mark notification read error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể đánh dấu đã đọc",
        });
      }
    },
  );
}
