import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { watchCalendarService, authenticate } from '../services/index.js';
import {
  calendarMonthQuerySchema,
  calendarDateParamsSchema,
  CalendarMonthQueryInput,
  CalendarDateParams,
} from './schemas/watchCalendar.schema.js';

export async function watchCalendarRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', authenticate);

  app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = calendarMonthQuerySchema.parse(request.query) as CalendarMonthQueryInput;

      const result = await watchCalendarService.getMonthOverview(
        request.user.userId,
        query.year,
        query.month,
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

      console.error('Get calendar month error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get calendar overview',
      });
    }
  });

  app.get('/:date', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = calendarDateParamsSchema.parse(request.params) as CalendarDateParams;

      const result = await watchCalendarService.getDayDetail(
        request.user.userId,
        params.date,
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

      console.error('Get calendar day error:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to get calendar day detail',
      });
    }
  });
}
