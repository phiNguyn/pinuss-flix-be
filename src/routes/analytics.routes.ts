import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { analyticsService } from "../services/analytics.service.js";
import { adminService } from "../services/index.js";
import { UserRole } from "../models/user.model.js";
import { z } from "zod";

// Validation schemas
const paginationSchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const timeRangeSchema = z.enum(["24h", "7d", "30d", "90d", "all"]);
const groupBySchema = z.enum(["day", "week", "month"]);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional();

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

    const decoded = await (request.server as any).jwt.verify(
      authHeader.replace("Bearer ", ""),
    );

    if (!decoded?.userId) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "Token không hợp lệ",
      });
    }

    const { isAdmin } = await adminService.verifyAdmin(decoded.userId);

    if (!isAdmin) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Bạn không có quyền truy cập trang này",
      });
    }

    (request as any).userId = decoded.userId;
  } catch (error) {
    return reply.status(401).send({
      error: "Unauthorized",
      message: "Token không hợp lệ hoặc đã hết hạn",
    });
  }
}

export async function analyticsRoutes(app: FastifyInstance) {
  // Apply admin guard to all routes
  app.addHook("preHandler", adminGuard);

  // ============================================
  // A. USER ANALYTICS ROUTES
  // ============================================

  /**
   * A1: GET /api/v1/analytics/users/overview
   */
  app.get("/users/overview", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await analyticsService.getUserOverview();
      return reply.send({ success: true, data: stats });
    } catch (error) {
      console.error("Error getting user overview:", error);
      return reply.status(500).send({ success: false, error: "Failed to get user overview" });
    }
  });

  /**
   * A2: GET /api/v1/analytics/users/growth
   */
  app.get("/users/growth", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional(),
        groupBy: groupBySchema.optional().default("day"),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
      }).parse(request.query);

      const growth = await analyticsService.getUserGrowth(
        query.range || "30d",
        query.groupBy,
        query.startDate,
        query.endDate
      );
      return reply.send({ success: true, data: growth });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting user growth:", error);
      return reply.status(500).send({ success: false, error: "Failed to get user growth" });
    }
  });

  /**
   * A3: GET /api/v1/analytics/users/active
   */
  app.get("/users/active", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional(),
        type: z.enum(["DAU", "MAU"]).optional().default("DAU"),
        startDate: dateSchema.optional(),
        endDate: dateSchema.optional(),
      }).parse(request.query);

      const activeUsers = await analyticsService.getActiveUsers(
        query.range || "30d",
        query.type,
        query.startDate,
        query.endDate
      );
      return reply.send({ success: true, data: activeUsers });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting active users:", error);
      return reply.status(500).send({ success: false, error: "Failed to get active users" });
    }
  });

  /**
   * A4: GET /api/v1/analytics/users/retention
   */
  app.get("/users/retention", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        days: z.coerce.number().min(1).max(90).optional().default(30),
      }).parse(request.query);
      const retention = await analyticsService.getRetentionRate(query.days);
      return reply.send({ success: true, data: retention });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting retention rate:", error);
      return reply.status(500).send({ success: false, error: "Failed to get retention rate" });
    }
  });

  /**
   * A5: GET /api/v1/analytics/users/segments
   */
  app.get("/users/segments", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const segments = await analyticsService.getUserSegments();
      return reply.send({ success: true, data: segments });
    } catch (error) {
      console.error("Error getting user segments:", error);
      return reply.status(500).send({ success: false, error: "Failed to get user segments" });
    }
  });

  // ============================================
  // B. CONTENT ANALYTICS ROUTES
  // ============================================

  /**
   * B1: GET /api/v1/analytics/movies/top
   */
  app.get("/movies/top", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        limit: z.coerce.number().min(1).max(100).optional().default(20),
        range: timeRangeSchema.optional().default("30d"),
        metric: z.enum(["views", "unique_viewers", "watch_time"]).optional().default("views"),
      }).parse(request.query);
      const topMovies = await analyticsService.getTopMovies(query.limit, query.range, query.metric);
      return reply.send({ success: true, data: topMovies });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting top movies:", error);
      return reply.status(500).send({ success: false, error: "Failed to get top movies" });
    }
  });

  /**
   * B2: GET /api/v1/analytics/movies/trending
   */
  app.get("/movies/trending", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        limit: z.coerce.number().min(1).max(50).optional().default(10),
        range: timeRangeSchema.optional().default("7d"),
      }).parse(request.query);
      const trending = await analyticsService.getTrendingMovies(query.limit, query.range);
      return reply.send({ success: true, data: trending });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting trending movies:", error);
      return reply.status(500).send({ success: false, error: "Failed to get trending movies" });
    }
  });

  /**
   * B3: GET /api/v1/analytics/movies/views-by-source
   */
  app.get("/movies/views-by-source", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional().default("30d"),
      }).parse(request.query);
      const viewsBySource = await analyticsService.getViewsBySource(query.range);
      return reply.send({ success: true, data: viewsBySource });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting views by source:", error);
      return reply.status(500).send({ success: false, error: "Failed to get views by source" });
    }
  });

  /**
   * B4: GET /api/v1/analytics/movies/completion-rate
   */
  app.get("/movies/completion-rate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        limit: z.coerce.number().min(1).max(100).optional().default(20),
        minViews: z.coerce.number().min(1).optional().default(10),
      }).parse(request.query);
      const completionRate = await analyticsService.getCompletionRate(query.limit, query.minViews);
      return reply.send({ success: true, data: completionRate });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting completion rate:", error);
      return reply.status(500).send({ success: false, error: "Failed to get completion rate" });
    }
  });

  /**
   * B5: GET /api/v1/analytics/movies/watch-time
   */
  app.get("/movies/watch-time", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional().default("30d"),
      }).parse(request.query);
      const watchTime = await analyticsService.getWatchTimeStats(query.range);
      return reply.send({ success: true, data: watchTime });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting watch time stats:", error);
      return reply.status(500).send({ success: false, error: "Failed to get watch time stats" });
    }
  });

  /**
   * B6: GET /api/v1/analytics/movies/drop-off
   */
  app.get("/movies/drop-off", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        movieId: z.string().optional(),
        limit: z.coerce.number().min(1).max(20).optional().default(10),
      }).parse(request.query);
      const dropOff = await analyticsService.getDropOffAnalysis(query.movieId, query.limit);
      return reply.send({ success: true, data: dropOff });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting drop-off analysis:", error);
      return reply.status(500).send({ success: false, error: "Failed to get drop-off analysis" });
    }
  });

  /**
   * GET /api/v1/analytics/movies/:movieId/engagement
   */
  app.get("/movies/:movieId/engagement", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { movieId } = request.params as { movieId: string };
      const engagement = await analyticsService.getMovieEngagement(movieId);
      return reply.send({ success: true, data: engagement });
    } catch (error) {
      console.error("Error getting movie engagement:", error);
      return reply.status(500).send({ success: false, error: "Failed to get movie engagement" });
    }
  });

  // ============================================
  // C. ENGAGEMENT ANALYTICS ROUTES
  // ============================================

  /**
   * C1: GET /api/v1/analytics/engagement/favorites
   */
  app.get("/engagement/favorites", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional().default("30d"),
      }).parse(request.query);
      const stats = await analyticsService.getFavoriteStats(query.range);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting favorite stats:", error);
      return reply.status(500).send({ success: false, error: "Failed to get favorite stats" });
    }
  });

  /**
   * C2: GET /api/v1/analytics/engagement/comments
   */
  app.get("/engagement/comments", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional().default("30d"),
      }).parse(request.query);
      const stats = await analyticsService.getCommentStats(query.range);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting comment stats:", error);
      return reply.status(500).send({ success: false, error: "Failed to get comment stats" });
    }
  });

  /**
   * C3: GET /api/v1/analytics/engagement/likes
   */
  app.get("/engagement/likes", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional().default("30d"),
        limit: z.coerce.number().min(1).max(50).optional().default(10),
      }).parse(request.query);
      const stats = await analyticsService.getLikeStats(query.range, query.limit);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting like stats:", error);
      return reply.status(500).send({ success: false, error: "Failed to get like stats" });
    }
  });

  /**
   * C4: GET /api/v1/analytics/engagement/shares
   */
  app.get("/engagement/shares", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional().default("30d"),
      }).parse(request.query);
      const stats = await analyticsService.getShareStats(query.range);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting share stats:", error);
      return reply.status(500).send({ success: false, error: "Failed to get share stats" });
    }
  });

  /**
   * C5: GET /api/v1/analytics/engagement/watchlist
   */
  app.get("/engagement/watchlist", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional().default("30d"),
      }).parse(request.query);
      const stats = await analyticsService.getWatchlistStats(query.range);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting watchlist stats:", error);
      return reply.status(500).send({ success: false, error: "Failed to get watchlist stats" });
    }
  });

  // ============================================
  // D. GAMIFICATION ANALYTICS ROUTES
  // ============================================

  /**
   * D1: GET /api/v1/analytics/gamification/streak-leaderboard
   */
  app.get("/gamification/streak-leaderboard", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        limit: z.coerce.number().min(1).max(50).optional().default(10),
      }).parse(request.query);
      const leaderboard = await analyticsService.getStreakLeaderboard(query.limit);
      return reply.send({ success: true, data: leaderboard });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting streak leaderboard:", error);
      return reply.status(500).send({ success: false, error: "Failed to get streak leaderboard" });
    }
  });

  /**
   * D2: GET /api/v1/analytics/gamification/checkin-heatmap
   */
  app.get("/gamification/checkin-heatmap", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        year: z.coerce.number().min(2020).max(2030),
        month: z.coerce.number().min(1).max(12),
      }).parse(request.query);
      const heatmap = await analyticsService.getCheckInHeatmap(query.year, query.month);
      return reply.send({ success: true, data: heatmap });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting check-in heatmap:", error);
      return reply.status(500).send({ success: false, error: "Failed to get check-in heatmap" });
    }
  });

  /**
   * D3: GET /api/v1/analytics/gamification/badges
   */
  app.get("/gamification/badges", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const distribution = await analyticsService.getBadgeDistribution();
      return reply.send({ success: true, data: distribution });
    } catch (error) {
      console.error("Error getting badge distribution:", error);
      return reply.status(500).send({ success: false, error: "Failed to get badge distribution" });
    }
  });

  /**
   * D4: GET /api/v1/analytics/gamification/watchtime-leaderboard
   */
  app.get("/gamification/watchtime-leaderboard", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        period: z.enum(["all", "weekly", "monthly"]).optional().default("all"),
        limit: z.coerce.number().min(1).max(50).optional().default(20),
      }).parse(request.query);
      const leaderboard = await analyticsService.getWatchTimeLeaderboard(query.period, query.limit);
      return reply.send({ success: true, data: leaderboard });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting watch time leaderboard:", error);
      return reply.status(500).send({ success: false, error: "Failed to get watch time leaderboard" });
    }
  });

  // ============================================
  // E. COLLECTION ANALYTICS ROUTES
  // ============================================

  /**
   * E1: GET /api/v1/analytics/collections
   */
  app.get("/collections", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await analyticsService.getCollectionStats();
      return reply.send({ success: true, data: stats });
    } catch (error) {
      console.error("Error getting collection stats:", error);
      return reply.status(500).send({ success: false, error: "Failed to get collection stats" });
    }
  });

  // ============================================
  // F. FEEDBACK & NOTIFICATION ANALYTICS ROUTES
  // ============================================

  /**
   * F1 & F2: GET /api/v1/analytics/feedback
   */
  app.get("/feedback", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional().default("30d"),
      }).parse(request.query);
      const stats = await analyticsService.getFeedbackStats(query.range);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting feedback stats:", error);
      return reply.status(500).send({ success: false, error: "Failed to get feedback stats" });
    }
  });

  /**
   * F3: GET /api/v1/analytics/notifications
   */
  app.get("/notifications", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = z.object({
        range: timeRangeSchema.optional().default("30d"),
      }).parse(request.query);
      const stats = await analyticsService.getNotificationStats(query.range);
      return reply.send({ success: true, data: stats });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return reply.status(400).send({ error: "Validation Error", details: error.errors });
      }
      console.error("Error getting notification stats:", error);
      return reply.status(500).send({ success: false, error: "Failed to get notification stats" });
    }
  });

  // ============================================
  // G. DASHBOARD ROUTE
  // ============================================

  /**
   * GET /api/v1/analytics/dashboard
   */
  app.get("/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const summary = await analyticsService.getDashboardSummary();
      return reply.send({ success: true, data: summary });
    } catch (error) {
      console.error("Error getting dashboard summary:", error);
      return reply.status(500).send({ success: false, error: "Failed to get dashboard summary" });
    }
  });
}
