import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { collectionService } from "../services/index.js";
import { z } from "zod";

const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  coverImage: z.string().optional(),
  isPublic: z.boolean().optional().default(false),
});

const updateCollectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  coverImage: z.string().optional(),
  isPublic: z.boolean().optional(),
});

const addMovieSchema = z.object({
  movieId: z.string().min(1),
  movieSlug: z.string().min(1),
  movieTitle: z.string().min(1),
  moviePoster: z.string().optional(),
  movieYear: z.number().int().positive().optional(),
  movieType: z.enum(["single", "series"]).optional(),
  source: z.string().optional().default("ophim"),
});

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

const reorderSchema = z.object({
  orderedMovieIds: z.array(z.string().min(1)).min(1),
});

export async function collectionRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  app.post(
    "/",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = (request as any).user.userId;
        const body = createCollectionSchema.parse(request.body);

        const collection = await collectionService.create(userId, body);

        return reply.status(201).send({
          success: true,
          data: collection,
          message: "Đã tạo bộ sưu tập mới",
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Create collection error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể tạo bộ sưu tập",
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

        const result = await collectionService.getList(userId, {
          page: query.page,
          limit: query.limit,
        });

        return reply.send({
          success: true,
          data: result.collections,
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
        console.error("Get collections error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy danh sách bộ sưu tập",
        });
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/:id",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { id } = request.params;

        const collection = await collectionService.getById(id, userId);

        if (!collection) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Bộ sưu tập không tồn tại",
          });
        }

        return reply.send({
          success: true,
          data: collection,
        });
      } catch (error) {
        console.error("Get collection error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy chi tiết bộ sưu tập",
        });
      }
    }
  );

  app.patch<{ Params: { id: string } }>(
    "/:id",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { id } = request.params;
        const body = updateCollectionSchema.parse(request.body);

        const collection = await collectionService.update(id, userId, body);

        if (!collection) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Bộ sưu tập không tồn tại",
          });
        }

        return reply.send({
          success: true,
          data: collection,
          message: "Đã cập nhật bộ sưu tập",
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Update collection error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể cập nhật bộ sưu tập",
        });
      }
    }
  );

  app.delete<{ Params: { id: string } }>(
    "/:id",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { id } = request.params;

        const deleted = await collectionService.delete(id, userId);

        if (!deleted) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Bộ sưu tập không tồn tại",
          });
        }

        return reply.send({
          success: true,
          message: "Đã xóa bộ sưu tập",
        });
      } catch (error) {
        console.error("Delete collection error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể xóa bộ sưu tập",
        });
      }
    }
  );

  app.post<{ Params: { id: string }; Body: any }>(
    "/:id/movies",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { id } = request.params;
        const body = addMovieSchema.parse(request.body);

        const result = await collectionService.addMovie(id, userId, body);

        return reply.status(result.isNew || result.restored ? 201 : 200).send({
          success: true,
          isNew: result.isNew,
          restored: result.restored,
          data: result.item,
          message: result.isNew
            ? "Đã thêm phim vào bộ sưu tập"
            : result.restored
            ? "Đã khôi phục phim vào bộ sưu tập"
            : "Phim đã có trong bộ sưu tập",
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        if (error.message === "Collection not found") {
          return reply.status(404).send({
            error: "Not Found",
            message: "Bộ sưu tập không tồn tại",
          });
        }
        console.error("Add movie to collection error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể thêm phim vào bộ sưu tập",
        });
      }
    }
  );

  app.get<{ Params: { id: string } }>(
    "/:id/removed-movies",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { id } = request.params;

        const removedMovies = await collectionService.getRemovedMovies(id, userId);

        return reply.send({
          success: true,
          data: removedMovies,
        });
      } catch (error) {
        console.error("Get removed movies error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể lấy danh sách phim đã xóa",
        });
      }
    }
  );

  app.post<{ Params: { id: string; movieId: string }; Querystring: { source?: string } }>(
    "/:id/restore-movie/:movieId",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { id, movieId } = request.params;
        const { source } = request.query as { source?: string };

        const restored = await collectionService.restoreMovie(
          id,
          userId,
          movieId,
          source
        );

        if (!restored) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Phim không có trong danh sách đã xóa",
          });
        }

        return reply.send({
          success: true,
          message: "Đã khôi phục phim vào bộ sưu tập",
        });
      } catch (error) {
        console.error("Restore movie error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể khôi phục phim",
        });
      }
    }
  );

  app.patch<{
    Params: { id: string; movieId: string };
    Body: { action?: string; source?: string };
  }>(
    "/:id/movies/:movieId",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { id, movieId } = request.params;
        const { action, source } = request.body as {
          action?: string;
          source?: string;
        };

        if (action === "remove" || !action) {
          const removed = await collectionService.removeMovie(id, userId, movieId, source);

          if (!removed) {
            return reply.status(404).send({
              error: "Not Found",
              message: "Phim không có trong bộ sưu tập",
            });
          }

          return reply.send({
            success: true,
            message: "Đã xóa phim khỏi bộ sưu tập",
          });
        }

        return reply.status(400).send({
          error: "Bad Request",
          message: "Invalid action",
        });
      } catch (error) {
        console.error("Remove movie from collection error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể xóa phim khỏi bộ sưu tập",
        });
      }
    }
  );

  app.patch<{ Params: { id: string }; Body: { orderedMovieIds: string[] } }>(
    "/:id/reorder",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { id } = request.params;
        const body = reorderSchema.parse(request.body);

        const success = await collectionService.reorderMovies(
          id,
          userId,
          body.orderedMovieIds
        );

        if (!success) {
          return reply.status(404).send({
            error: "Not Found",
            message: "Bộ sưu tập không tồn tại",
          });
        }

        return reply.send({
          success: true,
          message: "Đã sắp xếp lại thứ tự phim",
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }
        console.error("Reorder movies error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể sắp xếp lại phim",
        });
      }
    }
  );

  app.get<{ Params: { id: string }; Querystring: { movieId: string; source?: string } }>(
    "/:id/check-movie",
    async (request, reply) => {
      try {
        const userId = (request as any).user.userId;
        const { id } = request.params;
        const { movieId, source } = request.query as { movieId: string; source?: string };

        const collections = await collectionService.checkMovieInCollections(
          userId,
          movieId,
          source
        );

        const isInThisCollection = collections.some(
          (c) => c._id.toString() === id
        );

        return reply.send({
          success: true,
          data: {
            isInCollection: isInThisCollection,
            collectionNames: collections.map((c) => c.name),
          },
        });
      } catch (error) {
        console.error("Check movie in collections error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể kiểm tra trạng thái phim",
        });
      }
    }
  );
}
