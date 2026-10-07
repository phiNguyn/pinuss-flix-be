import { z } from "zod";

export const TimeRangeSchema = z.enum(["24h", "7d", "30d", "90d", "all"]);
export type TimeRange = z.infer<typeof TimeRangeSchema>;

export const GroupBySchema = z.enum(["day", "week", "month"]);
export type GroupBy = z.infer<typeof GroupBySchema>;

export const MetricSchema = z.enum(["views", "unique_viewers", "watch_time"]);
export type Metric = z.infer<typeof MetricSchema>;

export const LeaderboardPeriodSchema = z.enum(["all", "weekly", "monthly"]);
export type LeaderboardPeriod = z.infer<typeof LeaderboardPeriodSchema>;

// User Analytics Schemas
export const UserOverviewQuerySchema = z.object({});

export const UserGrowthQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
  groupBy: GroupBySchema.optional().default("day"),
});

export const ActiveUsersQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
  type: z.enum(["DAU", "MAU"]).optional().default("DAU"),
});

export const RetentionQuerySchema = z.object({
  days: z.coerce.number().min(1).max(90).optional().default(30),
});

export const UserSegmentsQuerySchema = z.object({});

// Content Analytics Schemas
export const TopMoviesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  range: TimeRangeSchema.optional().default("30d"),
  metric: MetricSchema.optional().default("views"),
});

export const TrendingMoviesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(10),
  range: TimeRangeSchema.optional().default("7d"),
});

export const ViewsBySourceQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
});

export const CompletionRateQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  minViews: z.coerce.number().min(1).optional().default(10),
});

export const WatchTimeStatsQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
});

export const DropOffQuerySchema = z.object({
  movieId: z.string().optional(),
  limit: z.coerce.number().min(1).max(20).optional().default(10),
});

export const MovieEngagementParamsSchema = z.object({
  movieId: z.string(),
});

// Engagement Analytics Schemas
export const FavoriteStatsQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
});

export const CommentStatsQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
});

export const LikeStatsQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

export const ShareStatsQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
});

export const WatchlistStatsQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
});

// Gamification Analytics Schemas
export const StreakLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(50).optional().default(10),
});

export const CheckInHeatmapQuerySchema = z.object({
  year: z.coerce.number().min(2020).max(2030),
  month: z.coerce.number().min(1).max(12),
});

export const BadgeDistributionQuerySchema = z.object({});

export const WatchTimeLeaderboardQuerySchema = z.object({
  period: LeaderboardPeriodSchema.optional().default("all"),
  limit: z.coerce.number().min(1).max(50).optional().default(20),
});

// Collection Analytics Schemas
export const CollectionStatsQuerySchema = z.object({});

// Feedback Analytics Schemas
export const FeedbackStatsQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
});

// Notification Analytics Schemas
export const NotificationStatsQuerySchema = z.object({
  range: TimeRangeSchema.optional().default("30d"),
});

// Dashboard Schema
export const DashboardQuerySchema = z.object({});
