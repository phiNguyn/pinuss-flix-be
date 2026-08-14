import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { favoriteService } from "../services/index.js";
import { FavoriteSource } from "../models/index.js";
import { z } from "zod";

const addFavoriteSchema = z.object({
  movieId: z.string().min(1),
  movieSlug: z.string().min(1),
  movieTitle: z.string().min(1),
  moviePoster: z.string().optional(),
  movieYear: z.number().int().positive().optional(),
  movieType: z.enum(["single", "series"]).optional(),
  source: z.enum(["ophim", "phimapi", "nguonc"]).optional().default("ophim"),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  source: z.enum(["ophim", "phimapi", "nguonc"]).optional(),
});

const bulkCheckSchema = z.object({
  movieIds: z.array(z.string().min(1)).min(1).max(100),
  source: z.enum(["ophim", "phimapi", "nguonc"]).optional(),
});

export async function favoriteRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const body = addFavoriteSchema.parse(request.body);

        const result = await favoriteService.add(userId, {
          ...body,
          source: body.source as FavoriteSource,
        });

        return reply.status(result.isNew ? 201 : 200).send({
          success: true,
          isNew: result.isNew,
          data: result.favorite,
          message: result.isNew
            ? "Đã thêm vào danh sách yêu thích"
            : "Phim đã có trong danh sách yêu thích",
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Add favorite error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể thêm vào danh sách yêu thích",
        });
      }
    }
  );

  app.get(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const query = listQuerySchema.parse(request.query);

        const result = await favoriteService.getList(userId, {
          page: query.page,
          limit: query.limit,
          source: query.source as FavoriteSource | undefined,
        });

        return reply.send({
          success: true,
          data: result.favorites,
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
        console.error("Get favorites error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy danh sách yêu thích",
        });
      }
    }
  );

  app.patch<{
    Params: { movieId: string };
    Body: { action?: string; source?: string };
  }>(
    "/:movieId",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { movieId } = request.params;
        const { action, source } = request.body as {
          action?: string;
          source?: string;
        };

        if (action === "remove" || !action) {
          const removed = await favoriteService.remove(
            userId,
            movieId,
            source as FavoriteSource | undefined
          );

          if (!removed) {
            return reply.status(404).send({
              error: "Not Found",
              message: "Phim không có trong danh sách yêu thích",
            });
          }

          return reply.send({
            success: true,
            message: "Đã xóa khỏi danh sách yêu thích",
          });
        }

        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid action",
        });
      } catch (error) {
        console.error("Remove favorite error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể xóa khỏi danh sách yêu thích",
        });
      }
    }
  );

  app.get<{
    Params: { movieId: string };
    Querystring: { source?: string };
  }>(
    "/:movieId/check",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { movieId } = request.params;
        const { source } = request.query as { source?: string };

        const result = await favoriteService.check(
          userId,
          movieId,
          source as FavoriteSource | undefined
        );

        return reply.send({
          success: true,
          isFavorited: result.isFavorited,
        });
      } catch (error) {
        console.error("Check favorite error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể kiểm tra trạng thái yêu thích",
        });
      }
    }
  );

  app.post<{ Body: { movieIds: string[]; source?: string } }>(
    "/bulk-check",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const body = bulkCheckSchema.parse(request.body);

        const favoritedIds = await favoriteService.bulkCheck(
          userId,
          body.movieIds,
          body.source as FavoriteSource | undefined
        );

        return reply.send({
          success: true,
          data: {
            favoritedIds: Array.from(favoritedIds),
          },
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Bulk check favorites error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể kiểm tra trạng thái yêu thích",
        });
      }
    }
  );

  app.get(
    "/count",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const count = await favoriteService.getUserFavoriteCount(userId);

        return reply.send({
          success: true,
          data: { count },
        });
      } catch (error) {
        console.error("Get favorite count error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy số lượng yêu thích",
        });
      }
    }
  );
}
