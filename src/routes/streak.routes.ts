import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { streakService, authenticate } from "../services/index.js";
import { z } from "zod";

const monthQuerySchema = z.object({
  year: z.coerce.number().min(2020).max(2100),
  month: z.coerce.number().min(1).max(12),
});

export async function streakRoutes(app: FastifyInstance): Promise<void> {
  app.addHook("onRequest", authenticate);

  app.post(
    "/check-in",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await streakService.checkIn(request.user.userId);

        return reply.send({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error("Streak check-in error:", error);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: "Không thể điểm danh",
        });
      }
    },
  );

  app.get("/me", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const profile = await streakService.getProfile(request.user.userId);

      return reply.send({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("Get streak profile error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Không thể lấy thông tin chuỗi",
      });
    }
  });

  app.get("/calendar", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = monthQuerySchema.parse(request.query);
      const dates = await streakService.getMonthCheckIns(
        request.user.userId,
        query.year,
        query.month,
      );

      return reply.send({
        success: true,
        data: { year: query.year, month: query.month, dates },
      });
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Validation Error",
          details: error.errors,
        });
      }
      console.error("Get streak calendar error:", error);
      return reply.status(500).send({
        error: "Internal Server Error",
        message: "Không thể lấy lịch điểm danh",
      });
    }
  });
}
