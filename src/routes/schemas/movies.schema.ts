import { z } from "zod";

export const scheduledEpisodesQuerySchema = z.object({
  slug: z.string().min(1, "slug is required"),
});

export type ScheduledEpisodesQueryInput = z.infer<
  typeof scheduledEpisodesQuerySchema
>;
