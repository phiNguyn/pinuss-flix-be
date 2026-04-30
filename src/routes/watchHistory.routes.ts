import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { watchHistoryService, authenticate } from '../services/index.js';
import {
  createWatchHistorySchema,
  updateWatchHistorySchema,
  watchHistoryParamsSchema,
  CreateWatchHistoryInput,
  UpdateWatchHistoryInput,
  WatchHistoryParams,
  paginationSchema,
  PaginationInput,
} from './schemas/index.js';

export async function watchHistoryRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authenticate);

  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = paginationSchema.parse(request.query);
      const { page, limit } = query as PaginationInput;

      const result = await watchHistoryService.getByUserId(request.user.userId, { page, limit });

      return reply.send({
        data: result.data.map((item) => ({
          id: item._id,
          movieId: item.movieId,
          movieTitle: item.movieTitle,
          moviePoster: item.moviePoster,
          progress: item.progress,
          duration: item.duration,
          completed: item.completed,
          watchedAt: item.watchedAt,
        })),
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      console.error('Get watch history error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get watch history',
      });
    }
  });

  app.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = createWatchHistorySchema.parse(request.body);
      const data = body as CreateWatchHistoryInput;

      const result = await watchHistoryService.createOrUpdate(request.user.userId, data);

      return reply.status(201).send({
        id: result._id,
        movieId: result.movieId,
        movieTitle: result.movieTitle,
        moviePoster: result.moviePoster,
        progress: result.progress,
        duration: result.duration,
        completed: result.completed,
        watchedAt: result.watchedAt,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      console.error('Create watch history error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to create watch history',
      });
    }
  });

  app.get('/recent', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await watchHistoryService.getRecentlyWatched(request.user.userId, 10);

      return reply.send({
        data: result.map((item) => ({
          id: item._id,
          movieId: item.movieId,
          movieTitle: item.movieTitle,
          moviePoster: item.moviePoster,
          progress: item.progress,
          duration: item.duration,
          completed: item.completed,
          watchedAt: item.watchedAt,
        })),
      });
    } catch (error) {
      console.error('Get recent watch history error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get recent watch history',
      });
    }
  });

  app.get('/continue', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await watchHistoryService.getContinueWatching(request.user.userId, 10);

      return reply.send({
        data: result.map((item) => ({
          id: item._id,
          movieId: item.movieId,
          movieTitle: item.movieTitle,
          moviePoster: item.moviePoster,
          progress: item.progress,
          duration: item.duration,
          completed: item.completed,
          watchedAt: item.watchedAt,
        })),
      });
    } catch (error) {
      console.error('Get continue watching error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get continue watching list',
      });
    }
  });

  app.get('/:movieId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = watchHistoryParamsSchema.parse(request.params);
      const { movieId } = params as WatchHistoryParams;

      const result = await watchHistoryService.getByMovieId(request.user.userId, movieId);

      if (!result) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Watch history not found',
        });
      }

      return reply.send({
        id: result._id,
        movieId: result.movieId,
        movieTitle: result.movieTitle,
        moviePoster: result.moviePoster,
        progress: result.progress,
        duration: result.duration,
        completed: result.completed,
        watchedAt: result.watchedAt,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      console.error('Get watch history by movie error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get watch history',
      });
    }
  });

  app.patch('/:movieId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = watchHistoryParamsSchema.parse(request.params);
      const { movieId } = params as WatchHistoryParams;

      const body = updateWatchHistorySchema.parse(request.body);
      const data = body as UpdateWatchHistoryInput;

      const result = await watchHistoryService.update(request.user.userId, movieId, data);

      if (!result) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Watch history not found',
        });
      }

      return reply.send({
        id: result._id,
        movieId: result.movieId,
        movieTitle: result.movieTitle,
        moviePoster: result.moviePoster,
        progress: result.progress,
        duration: result.duration,
        completed: result.completed,
        watchedAt: result.watchedAt,
      });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      console.error('Update watch history error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to update watch history',
      });
    }
  });

  app.delete('/:movieId', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = watchHistoryParamsSchema.parse(request.params);
      const { movieId } = params as WatchHistoryParams;

      const deleted = await watchHistoryService.delete(request.user.userId, movieId);

      if (!deleted) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Watch history not found',
        });
      }

      return reply.send({ message: 'Watch history deleted successfully' });
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return reply.status(400).send({
          error: 'Validation Error',
          details: error.errors,
        });
      }
      console.error('Delete watch history error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete watch history',
      });
    }
  });

  app.delete('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const deletedCount = await watchHistoryService.deleteAll(request.user.userId);

      return reply.send({
        message: `Deleted ${deletedCount} watch history records`,
        deletedCount,
      });
    } catch (error) {
      console.error('Delete all watch history error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to delete watch history',
      });
    }
  });
}
