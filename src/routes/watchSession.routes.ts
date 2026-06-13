import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { watchSessionService, authenticate } from '../services/index.js';
import {
  createWatchSessionSchema,
  CreateWatchSessionInput,
} from './schemas/watchSession.schema.js';

export async function watchSessionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authenticate);

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createWatchSessionSchema.parse(request.body) as CreateWatchSessionInput;

      const session = await watchSessionService.recordSession(
        request.user.userId,
        body,
      );

      return reply.send({
        success: true,
        data: {
          id: session._id,
          movieId: session.movieId,
          episodeSlug: session.episodeSlug,
          watchedSeconds: session.watchedSeconds,
          watchDate: session.watchDate,
          endedAt: session.endedAt,
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      if (
        error.message?.includes('watchedSeconds') ||
        error.message?.includes('cannot exceed')
      ) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: error.message,
        });
      }

      console.error('Record watch session error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to record watch session',
      });
    }
  });

  app.get('/stats/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const stats = await watchSessionService.getMyStats(request.user.userId);

      return reply.send({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Get watch stats error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get watch stats',
      });
    }
  });
}
