import { z } from 'zod';

export const leaderboardQuerySchema = z.object({
  period: z.enum(['all', 'week', 'month']).default('all'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

export type LeaderboardQueryInput = z.infer<typeof leaderboardQuerySchema>;
