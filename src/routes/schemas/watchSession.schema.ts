import { z } from 'zod';

export const createWatchSessionSchema = z.object({
  movieId: z.string().min(1, 'Movie ID is required'),
  movieTitle: z.string().min(1, 'Movie title is required'),
  moviePoster: z.string().optional(),
  originName: z.string().optional(),
  year: z.number().optional(),
  source: z.enum(['ophim', 'phimapi', 'nguonc']).default('ophim'),
  episodeSlug: z.string().min(1, 'Episode slug is required'),
  episodeName: z.string().optional(),
  watchedSeconds: z.number().int().min(1).max(120),
  progressStart: z.number().min(0).optional(),
  progressEnd: z.number().min(0).optional(),
  timezone: z.string().optional(),
});

export type CreateWatchSessionInput = z.infer<typeof createWatchSessionSchema>;
