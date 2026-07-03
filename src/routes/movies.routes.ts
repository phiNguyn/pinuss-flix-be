import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  moviesService,
  UpstreamFetchError,
} from "../services/movies.service.js";
import { scheduledEpisodesQuerySchema } from "./schemas/movies.schema.js";

export async function moviesRoutes(app: FastifyInstance): Promise<void> {
  // ========== PUBLIC ENDPOINTS ==========

  // GET /api/v1/movies/scheduled-episodes?slug=<slug>
  app.get(
    "/scheduled-episodes",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = scheduledEpisodesQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.status(400).send({
          error: "Validation Error",
          details: parsed.error.issues,
        });
      }

      try {
        const data = await moviesService.getScheduledEpisodes(parsed.data.slug);

        return reply.send({
          success: true,
          data,
        });
      } catch (error) {
        const logContext =
          error instanceof UpstreamFetchError
            ? {
                slug: parsed.data.slug,
                upstreamUrl: error.url,
                upstreamStatus: error.status,
                upstreamBody: error.body,
                message: error.message,
              }
            : {
                slug: parsed.data.slug,
                message:
                  error instanceof Error ? error.message : "Unknown error",
              };

        // Vercel entry uses Fastify({ logger: false }) — request.log is a no-op.
        console.error("[scheduled-episodes]", JSON.stringify(logContext));

        return reply.status(502).send({
          error: "Bad Gateway",
          message: "Failed to fetch scheduled episodes",
          debug: logContext,
        });
      }
    },
  );
}
