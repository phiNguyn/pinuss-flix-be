import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { movieViewLogService } from "../services/index.js";
import { ViewAction, ViewSource } from "../models/index.js";
import { z } from "zod";

const createViewLogSchema = z.object({
  movieId: z.string().min(1),
  action: z.enum(["view", "complete", "favorite", "unfavorite", "watchlist", "unwatchlist", "share"]),
  source: z.enum(["ophim", "phimapi", "nguonc"]).optional().default("ophim"),
  sessionId: z.string().optional(),
  metadata: z
    .object({
      episodeSlug: z.string().optional(),
      episodeName: z.string().optional(),
      progress: z.number().optional(),
      duration: z.number().optional(),
    })
    .optional(),
});

const mergeSessionSchema = z.object({
  sessionId: z.string().min(1),
});

const trendingQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  hoursBack: z.coerce.number().min(1).max(168).optional().default(24), // Max 7 days
});

export async function movieViewLogRoutes(app: FastifyInstance) {
  // ========== PUBLIC ENDPOINTS ==========

  /**
   * POST /api/v1/view-logs - Log a view event (anonymous or logged in)
   */
  app.post(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = createViewLogSchema.parse(request.body);

        // Get userId if logged in
        let userId: string | undefined;
        try {
          const authHeader = request.headers.authorization;
          if (authHeader?.startsWith("Bearer ")) {
            const decoded = await app.jwt.verify(
              authHeader.replace("Bearer ", "")
            );
            userId = (decoded as any).userId;
          }
        } catch {
          // User not authenticated, that's fine
        }

        const log = await movieViewLogService.logView({
          movieId: body.movieId,
          action: body.action,
          source: body.source,
          sessionId: body.sessionId,
          userId,
          metadata: body.metadata,
        });

        return reply.send({
          success: true,
          data: log,
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Log view error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to log view",
        });
      }
    }
  );

  /**
   * GET /api/v1/view-logs/trending - Get trending movies (public)
   */
  app.get(
    "/trending",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const query = trendingQuerySchema.parse(request.query);

        const trending = await movieViewLogService.getTrendingMovies(
          query.limit,
          query.hoursBack
        );

        return reply.send({
          success: true,
          data: trending,
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Get trending error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get trending movies",
        });
      }
    }
  );

  // ========== PROTECTED ENDPOINTS (require auth) ==========

  /**
   * POST /api/v1/view-logs/merge - Merge anonymous session to user
   */
  app.post(
    "/merge",
    {
      preHandler: [(app as any).authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const body = mergeSessionSchema.parse(request.body);
        const userId = (request.user as any).userId;

        const result = await movieViewLogService.mergeSessionToUser(
          body.sessionId,
          userId
        );

        return reply.send({
          success: true,
          message: `Merged ${result.mergedCount} records`,
          mergedCount: result.mergedCount,
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Merge session error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to merge session",
        });
      }
    }
  );

  /**
   * GET /api/v1/view-logs/history - Get user's view history
   */
  app.get(
    "/history",
    {
      preHandler: [(app as any).authenticate],
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request.user as any).userId;
        const page = parseInt((request.query as any).page || "1");
        const limit = Math.min(parseInt((request.query as any).limit || "20"), 50);

        const result = await movieViewLogService.getUserViewHistory(userId, {
          page,
          limit,
        });

        return reply.send({
          success: true,
          data: result.data,
          pagination: {
            page: result.page,
            limit: result.limit,
            total: result.total,
            totalPages: Math.ceil(result.total / result.limit),
          },
        });
      } catch (error) {
        console.error("Get history error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get view history",
        });
      }
    }
  );

  /**
   * GET /api/v1/view-logs/stats/:movieId - Get movie stats
   */
  app.get(
    "/stats/:movieId",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { movieId } = request.params as { movieId: string };

        const stats = await movieViewLogService.getMovieStats(movieId);

        return reply.send({
          success: true,
          data: stats,
        });
      } catch (error) {
        console.error("Get movie stats error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Failed to get movie stats",
        });
      }
    }
  );
}
