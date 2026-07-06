import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  adminService,
  streakService,
  watchCalendarService,
} from "../services/index.js";
import { UserRole } from "../models/index.js";
import { z } from "zod";
import {
  calendarMonthQuerySchema,
  calendarDateParamsSchema,
} from "./schemas/watchCalendar.schema.js";

// Validation schemas
const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const userListQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  role: z.enum(["user", "admin"]).optional(),
  isActive: z.coerce.boolean().optional(),
});

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["user", "admin"]),
});

const monthQuerySchema = z.object({
  year: z.coerce.number().min(2020).max(2100),
  month: z.coerce.number().min(1).max(12),
});

// Middleware to verify admin role
async function adminGuard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token không hợp lệ",
      });
    }

    // Get user ID from JWT
    const decoded = await (request.server as any).jwt.verify(
      authHeader.replace("Bearer ", ""),
    );

    if (!decoded?.userId) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token không hợp lệ",
      });
    }

    // CRITICAL: Verify admin role in database
    const { isAdmin, user } = await adminService.verifyAdmin(decoded.userId);

    if (!isAdmin) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Bạn không có quyền truy cập trang này",
      });
    }

    // Attach user info to request for audit logging
    (request as any).adminUser = user;
    (request as any).adminId = decoded.userId;
  } catch (error) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
}

export async function adminRoutes(app: FastifyInstance) {
  // Apply admin guard to all routes in this plugin
  app.addHook("preHandler", adminGuard);

  // ========== DASHBOARD ==========

  /**
   * GET /api/v1/admin/stats - Get admin dashboard statistics
   */
  app.get("/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await adminService.getStats();

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Get admin stats error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Không thể lấy thống kê",
      });
    }
  });

  // ========== USERS ==========

  /**
   * GET /api/v1/admin/users - Get paginated user list
   */
  app.get("/users", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = userListQuerySchema.parse(request.query);

      const result = await adminService.getUsers(query as any);

      return reply.send({
        success: true,
        data: result.users,
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
      console.error("Get users error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Không thể lấy danh sách người dùng",
      });
    }
  });

  /**
   * GET /api/v1/admin/users/:userId - Get user detail
   */
  app.get(
    "/users/:userId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };

        const user = await adminService.getUserDetail(userId);

        if (!user) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Người dùng không tồn tại",
          });
        }

        return reply.send({
          success: true,
          data: user,
        });
      } catch (error) {
        console.error("Get user detail error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy thông tin người dùng",
        });
      }
    },
  );

  /**
   * GET /api/v1/admin/users/:userId/watch-history - Get user's watch history (including deleted)
   */
  app.get(
    "/users/:userId/watch-history",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const query = paginationSchema.parse(request.query);

        const result = await adminService.getUserWatchHistory(userId, query);

        return reply.send({
          success: true,
          data: result.history,
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
        console.error("Get user watch history error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy lịch sử xem",
        });
      }
    },
  );

  /**
   * GET /api/v1/admin/users/:userId/streak - Get user's streak profile
   */
  app.get(
    "/users/:userId/streak",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };

        const user = await adminService.getUserDetail(userId);
        if (!user) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Người dùng không tồn tại",
          });
        }

        const profile = await streakService.getProfile(userId);

        return reply.send({
          success: true,
          data: profile,
        });
      } catch (error) {
        console.error("Get user streak error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy thông tin chuỗi",
        });
      }
    },
  );

  /**
   * GET /api/v1/admin/users/:userId/streak/calendar - Get user's streak calendar for a month
   */
  app.get(
    "/users/:userId/streak/calendar",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const query = monthQuerySchema.parse(request.query);

        const user = await adminService.getUserDetail(userId);
        if (!user) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Người dùng không tồn tại",
          });
        }

        const dates = await streakService.getMonthCheckIns(
          userId,
          query.year,
          query.month,
        );

        return reply.send({
          success: true,
          data: { year: query.year, month: query.month, dates },
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Get user streak calendar error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy lịch điểm danh",
        });
      }
    },
  );

  /**
   * GET /api/v1/admin/users/:userId/watch-calendar - Get user's watch calendar month overview
   */
  app.get(
    "/users/:userId/watch-calendar",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const query = calendarMonthQuerySchema.parse(request.query);

        const user = await adminService.getUserDetail(userId);
        if (!user) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Người dùng không tồn tại",
          });
        }

        const result = await watchCalendarService.getMonthOverview(
          userId,
          query.year,
          query.month,
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Get user watch calendar error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy lịch xem phim",
        });
      }
    },
  );

  /**
   * GET /api/v1/admin/users/:userId/watch-calendar/:date - Get user's watch calendar day detail
   */
  app.get(
    "/users/:userId/watch-calendar/:date",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const params = calendarDateParamsSchema.parse(request.params);

        const user = await adminService.getUserDetail(userId);
        if (!user) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Người dùng không tồn tại",
          });
        }

        const result = await watchCalendarService.getDayDetail(
          userId,
          params.date,
        );

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Get user watch calendar day error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy chi tiết ngày xem phim",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/admin/users/:userId/role - Update user role
   */
  app.patch(
    "/users/:userId/role",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const body = updateRoleSchema.parse(request.body);
        const adminId = (request as any).adminId;

        // Prevent admin from demoting themselves
        if (userId === adminId) {
          return reply.status(400).send({
            error: "Bad Request",
            message: "Không thể tự thay đổi vai trò của mình",
          });
        }

        const result = await adminService.updateUserRole(
          userId,
          body.role as UserRole,
          adminId,
        );

        if (!result.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: result.message,
          });
        }

        return reply.send({
          success: true,
          message: result.message,
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Update user role error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể cập nhật vai trò",
        });
      }
    },
  );

  /**
   * PATCH /api/v1/admin/users/:userId/status - Toggle user active status
   */
  app.patch(
    "/users/:userId/status",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { userId } = request.params as { userId: string };
        const { isActive } = z
          .object({ isActive: z.boolean() })
          .parse(request.body);

        const result = await adminService.toggleUserStatus(userId, isActive);

        if (!result.success) {
          return reply.status(400).send({
            error: "Bad Request",
            message: result.message,
          });
        }

        return reply.send({
          success: true,
          message: result.message,
        });
      } catch (error) {
        console.error("Toggle user status error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể thay đổi trạng thái tài khoản",
        });
      }
    },
  );

  // ========== COMMENTS ==========

  /**
   * GET /api/v1/admin/comments - Get all comments
   */
  app.get("/comments", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = paginationSchema
        .extend({
          userId: z.string().optional(),
          movieSlug: z.string().optional(),
        })
        .parse(request.query);

      const result = await adminService.getComments(query);

      return reply.send({
        success: true,
        data: result.comments,
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
      console.error("Get comments error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Không thể lấy danh sách bình luận",
      });
    }
  });

  /**
   * DELETE /api/v1/admin/comments/:commentId - Delete a comment
   */
  app.delete(
    "/comments/:commentId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { commentId } = request.params as { commentId: string };

        const success = await adminService.deleteComment(commentId);

        if (!success) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Bình luận không tồn tại",
          });
        }

        return reply.send({
          success: true,
          message: "Đã xóa bình luận",
        });
      } catch (error) {
        console.error("Delete comment error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể xóa bình luận",
        });
      }
    },
  );
}
