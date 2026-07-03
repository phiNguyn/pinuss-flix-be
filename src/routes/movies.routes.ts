import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { moviesService } from "../services/index.js";
import {
  scheduledEpisodesQuerySchema,
  ScheduledEpisodesQueryInput,
} from "./schemas/movies.schema.js";

export async function moviesRoutes(app: FastifyInstance): Promise<void> {
  // ========== PUBLIC ENDPOINTS ==========

  // GET /api/v1/movies/scheduled-episodes?slug=<slug>
  app.get(
    "/scheduled-episodes",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { slug } = scheduledEpisodesQuerySchema.parse(
          request.query,
        ) as ScheduledEpisodesQueryInput;

        const data = await moviesService.getScheduledEpisodes(slug);

        return reply.send({
          success: true,
          data,
        });
      } catch (error: any) {
        if (error.name === "ZodError") {
          return reply.status(400).send({
            error: "Validation Error",
            details: error.errors,
          });
        }

        console.error("Get scheduled episodes error:", error);
        return reply.status(502).send({
          error: "Bad Gateway",
          message: "Failed to fetch scheduled episodes",
        });
      }
    },
  );
}
