import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { leaderboardService, authenticate } from '../services/index.js';
import {
  leaderboardQuerySchema,
  LeaderboardQueryInput,
} from './schemas/leaderboard.schema.js';

export async function leaderboardRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = leaderboardQuerySchema.parse(request.query) as LeaderboardQueryInput;

      let currentUserId: string | undefined;
      try {
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const decoded = await app.jwt.verify(authHeader.replace('Bearer ', ''));
          currentUserId = (decoded as { userId: string }).userId;
        }
      } catch {
        // Optional auth for myRank
      }

      const result = await leaderboardService.getLeaderboard({
        period: query.period,
        page: query.page,
        limit: query.limit,
        currentUserId,
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      console.error('Get leaderboard error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get leaderboard',
      });
    }
  });

  app.get('/me', { onRequest: authenticate }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = leaderboardQuerySchema
        .pick({ period: true })
        .parse(request.query);

      const result = await leaderboardService.getMyRank(
        request.user.userId,
        query.period,
      );

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }

      console.error('Get my rank error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get rank',
      });
    }
  });
}
