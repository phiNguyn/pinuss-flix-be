import { z } from 'zod';

export const createWatchHistorySchema = z.object({
  movieId: z.string().min(1, 'Movie ID is required'),
  movieTitle: z.string().min(1, 'Movie title is required'),
  moviePoster: z.string().optional(),
  // Additional movie info
  originName: z.string().optional(),
  episodeCurrent: z.string().optional(),
  year: z.number().optional(),
  quality: z.string().optional(),
  // Progress info
  progress: z.number().min(0).default(0),
  duration: z.number().min(0).default(0),
  completed: z.boolean().default(false),
  // Episode info
  currentEpSlug: z.string().optional(),
  currentEpName: z.string().optional(),
  // Source: ophim, phimapi, nguonc
  source: z.enum(['ophim', 'phimapi', 'nguonc']).default('ophim'),
});

export const updateWatchHistorySchema = z.object({
  progress: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
  completed: z.boolean().optional(),
  // Additional movie info (for when creating via upsert)
  movieTitle: z.string().optional(),
  moviePoster: z.string().optional(),
  originName: z.string().optional(),
  episodeCurrent: z.string().optional(),
  year: z.number().optional(),
  quality: z.string().optional(),
  // Episode info
  currentEpSlug: z.string().optional(),
  currentEpName: z.string().optional(),
  // Source
  source: z.enum(['ophim', 'phimapi', 'nguonc']).optional(),
});

export const bulkCreateWatchHistorySchema = z.object({
  items: z.array(createWatchHistorySchema).min(1).max(100),
});

export const watchHistoryParamsSchema = z.object({
  movieId: z.string().min(1, 'Movie ID is required'),
});

export type CreateWatchHistoryInput = z.infer<typeof createWatchHistorySchema>;
export type UpdateWatchHistoryInput = z.infer<typeof updateWatchHistorySchema>;
export type WatchHistoryParams = z.infer<typeof watchHistoryParamsSchema>;
