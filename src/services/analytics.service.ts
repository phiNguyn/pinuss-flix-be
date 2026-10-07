import { Types, PipelineStage } from "mongoose";
import {
  User,
  UserRole,
  Provider,
  MovieViewLog,
  WatchSession,
  WatchHistory,
  Favorite,
  Comment,
  UserWatchStats,
  DailyCheckIn,
  Collection,
  Feedback,
  FeedbackStatus,
  Notification,
  UserBadge,
} from "../models/index.js";

export type TimeRange = "24h" | "7d" | "30d" | "90d" | "all";
export type GroupBy = "day" | "week" | "month";
export type UserSegment = "casual" | "engaged" | "power_user";

export interface CustomDateRange {
  startDate?: string; // ISO date string
  endDate?: string;   // ISO date string
}

interface DateRange {
  startDate: Date;
  endDate: Date;
}

function getDateRange(range: TimeRange): DateRange;
function getDateRange(startDate: string, endDate: string): DateRange;
function getDateRange(rangeOrStart: TimeRange | string, endDate?: string): DateRange {
  let startDate: Date;
  let endDateObj: Date;

  if (typeof rangeOrStart === "string" && rangeOrStart.includes("-")) {
    // Custom date range
    startDate = new Date(rangeOrStart);
    endDateObj = endDate ? new Date(endDate) : new Date();
  } else {
    // Preset range
    endDateObj = new Date();
    startDate = new Date();

    switch (rangeOrStart as TimeRange) {
      case "24h":
        startDate.setHours(startDate.getHours() - 24);
        break;
      case "7d":
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(startDate.getDate() - 90);
        break;
      case "all":
      default:
        startDate.setFullYear(2000, 0, 1);
        break;
    }
  }

  return { startDate, endDate: endDateObj };
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export interface UserOverviewStats {
  totalUsers: number;
  totalAdmins: number;
  totalRegularUsers: number;
  byProvider: {
    local: number;
    google: number;
  };
  activeUsers: number;
  inactiveUsers: number;
}

export interface UserGrowthResult {
  date: string;
  newUsers: number;
  totalUsers: number;
}

export interface DailyActiveUser {
  date: string;
  count: number;
}

export interface RetentionData {
  day: number;
  retainedUsers: number;
  retentionRate: number;
}

export interface UserSegmentData {
  segment: UserSegment;
  label: string;
  count: number;
  percentage: number;
}

export interface TopMovie {
  movieId: string;
  movieTitle: string;
  views: number;
  uniqueViewers: number;
}

export interface TrendingMovie {
  movieId: string;
  movieTitle: string;
  views: number;
  trend: "up" | "down" | "stable";
  changePercent: number;
}

export interface ViewSourceStats {
  source: string;
  views: number;
  percentage: number;
}

export interface CompletionRateStats {
  movieId: string;
  movieTitle: string;
  totalStarted: number;
  totalCompleted: number;
  completionRate: number;
}

export interface WatchTimeStats {
  avgWatchTimeSeconds: number;
  avgWatchTimeFormatted: string;
  totalWatchTimeSeconds: number;
  totalWatchTimeFormatted: string;
}

export interface DropOffPoint {
  progressPercent: number;
  userCount: number;
  percentage: number;
}

export interface MovieEngagementStats {
  movieId: string;
  movieTitle: string;
  views: number;
  favorites: number;
  comments: number;
  shares: number;
  watchlistAdds: number;
  completionRate: number;
}

export interface FavoriteStats {
  totalFavorites: number;
  topFavoritedMovies: Array<{
    movieId: string;
    movieTitle: string;
    count: number;
  }>;
  byType: {
    single: number;
    series: number;
  };
  bySource: Record<string, number>;
}

export interface CommentStats {
  totalComments: number;
  topMoviesByComments: Array<{
    movieSlug: string;
    count: number;
  }>;
  avgCommentsPerMovie: number;
  repliesCount: number;
}

export interface LikeStats {
  totalLikes: number;
  topLikedComments: Array<{
    commentId: string;
    movieSlug: string;
    likes: number;
    userName: string;
  }>;
  avgLikesPerComment: number;
}

export interface ShareStats {
  totalShares: number;
  topSharedMovies: Array<{
    movieId: string;
    count: number;
  }>;
  sharesBySource: Record<string, number>;
}

export interface WatchlistStats {
  totalAdds: number;
  totalRemoves: number;
  netChange: number;
  topWatchlistedMovies: Array<{
    movieId: string;
    addCount: number;
    removeCount: number;
  }>;
}

export interface CheckInStreakStats {
  userId: string;
  userName: string;
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
}

export interface CheckInHeatmapData {
  date: string;
  count: number;
  users: number;
}

export interface BadgeDistribution {
  badgeId: string;
  badgeName: string;
  totalEarned: number;
  percentage: number;
}

export interface AnalyticsLeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  avatar?: string;
  watchSeconds: number;
  watchHours: number;
}

export interface CollectionStats {
  totalCollections: number;
  publicCollections: number;
  privateCollections: number;
  avgItemsPerCollection: number;
  topCollections: Array<{
    collectionId: string;
    name: string;
    itemCount: number;
    userName: string;
  }>;
}

export interface FeedbackStats {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  byCategory: Record<string, number>;
  avgResolutionTimeHours: number | null;
  avgResponseTimeHours: number | null;
}

export interface NotificationStats {
  totalSent: number;
  byType: Record<string, number>;
  avgReadRate: number;
}

export interface DashboardSummary {
  users: {
    total: number;
    newToday: number;
    active7d: number;
  };
  views: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  engagement: {
    todayCheckIns: number;
    totalWatchTimeSeconds: number;
    pendingFeedback: number;
  };
}

export class AnalyticsService {
  // ============================================
  // A. USER ANALYTICS
  // ============================================

  /**
   * A1: Get overview statistics of all users
   */
  async getUserOverview(): Promise<UserOverviewStats> {
    const [total, admins, byProvider, last7Days] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: UserRole.ADMIN }),
      User.aggregate([
        { $group: { _id: "$provider", count: { $sum: 1 } } },
      ]),
      User.countDocuments({
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    const providerMap: Record<string, number> = {};
    byProvider.forEach((p) => {
      providerMap[p._id] = p.count;
    });

    return {
      totalUsers: total,
      totalAdmins: admins,
      totalRegularUsers: total - admins,
      byProvider: {
        local: providerMap[Provider.LOCAL] || 0,
        google: providerMap[Provider.GOOGLE] || 0,
      },
      activeUsers: last7Days,
      inactiveUsers: total - last7Days,
    };
  }

  /**
   * A2: Get user growth over time
   */
  async getUserGrowth(
    range: TimeRange = "30d",
    groupBy: GroupBy = "day",
    startDate?: string,
    endDate?: string
  ): Promise<UserGrowthResult[]> {
    const dateRange = startDate && endDate
      ? getDateRange(startDate, endDate)
      : getDateRange(range);

    let formatString: string;
    switch (groupBy) {
      case "week":
        formatString = "%Y-W%V";
        break;
      case "month":
        formatString = "%Y-%m";
        break;
      default:
        formatString = "%Y-%m-%d";
    }

    const { startDate: sd, endDate: ed } = dateRange;

    const pipeline = [
      {
        $match: {
          createdAt: { $gte: sd, $lte: ed },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: formatString, date: "$createdAt" },
          },
          newUsers: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const results = await User.aggregate(pipeline);

    let cumulative = 0;
    const baselineCount = await User.countDocuments({ createdAt: { $lt: sd } });
    cumulative = baselineCount;

    return results.map((r) => {
      cumulative += r.newUsers;
      return {
        date: r._id,
        newUsers: r.newUsers,
        totalUsers: cumulative,
      };
    });
  }

  /**
   * A3: Get Daily/Monthly Active Users
   */
  async getActiveUsers(
    range: TimeRange = "30d",
    type: "DAU" | "MAU" = "DAU",
    startDate?: string,
    endDate?: string
  ): Promise<DailyActiveUser[]> {
    const dateRange = startDate && endDate
      ? getDateRange(startDate, endDate)
      : getDateRange(range);

    const { startDate: sd, endDate: ed } = dateRange;

    let formatString: string;
    if (type === "MAU") {
      formatString = "%Y-%m";
    } else {
      formatString = "%Y-%m-%d";
    }

    const pipeline = [
      {
        $match: {
          lastLogin: { $gte: sd, $lte: ed },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: formatString, date: "$lastLogin" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 as const } },
    ];

    const results = await User.aggregate(pipeline);

    return results.map((r) => ({
      date: r._id,
      count: r.count,
    }));
  }

  /**
   * A4: Get user retention rate
   */
  async getRetentionRate(daysRetention = 30): Promise<RetentionData[]> {
    const now = new Date();
    const results: RetentionData[] = [];

    for (let day = 1; day <= daysRetention; day++) {
      const cohortStart = new Date(now);
      cohortStart.setDate(cohortStart.getDate() - day * 2);
      const cohortEnd = new Date(cohortStart);
      cohortEnd.setDate(cohortEnd.getDate() + 1);

      const cohortUsers = await User.find({
        createdAt: { $gte: cohortStart, $lt: cohortEnd },
      }).select("_id");

      const cohortUserIds = new Set(cohortUsers.map((u) => u._id.toString()));

      const retentionDate = new Date(now);
      retentionDate.setDate(retentionDate.getDate() - day);

      const retainedCount = await DailyCheckIn.distinct("userId", {
        date: {
          $gte: retentionDate.toISOString().split("T")[0],
          $lt: new Date(retentionDate.getTime() + 86400000)
            .toISOString()
            .split("T")[0],
        },
        userId: { $in: Array.from(cohortUserIds) },
      });

      const retained = retainedCount.filter((id) => cohortUserIds.has(id.toString())).length;
      const total = cohortUserIds.size;

      results.push({
        day,
        retainedUsers: retained,
        retentionRate: total > 0 ? Math.round((retained / total) * 10000) / 100 : 0,
      });
    }

    return results;
  }

  /**
   * A5: Get user segments based on watch behavior
   */
  async getUserSegments(): Promise<UserSegmentData[]> {
    const totalUsers = await User.countDocuments({ role: UserRole.USER });

    const segments = await UserWatchStats.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      { $match: { "user.role": UserRole.USER } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $gte: ["$totalWatchSeconds", 72000] }, then: "power_user" },
                { case: { $gte: ["$totalWatchSeconds", 7200] }, then: "engaged" },
              ],
              default: "casual",
            },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const segmentMap: Record<string, number> = {
      casual: 0,
      engaged: 0,
      power_user: 0,
    };

    segments.forEach((s) => {
      segmentMap[s._id] = s.count;
    });

    const labels: Record<string, string> = {
      casual: "Casual ( < 2h )",
      engaged: "Engaged ( 2-20h )",
      power_user: "Power User ( > 20h )",
    };

    return Object.entries(segmentMap).map(([segment, count]) => ({
      segment: segment as UserSegment,
      label: labels[segment],
      count,
      percentage: totalUsers > 0 ? Math.round((count / totalUsers) * 10000) / 100 : 0,
    }));
  }

  // ============================================
  // B. CONTENT ANALYTICS
  // ============================================

  /**
   * B1: Get top viewed movies
   */
  async getTopMovies(
    limit = 20,
    range: TimeRange = "30d",
    metric: "views" | "unique_viewers" | "watch_time" = "views",
    startDate?: string,
    endDate?: string
  ): Promise<TopMovie[]> {
    const dateRange = startDate && endDate
      ? getDateRange(startDate, endDate)
      : getDateRange(range);

    const { startDate: sd, endDate: ed } = dateRange;

    let pipeline: PipelineStage[];

    if (metric === "unique_viewers") {
      pipeline = [
        {
          $match: {
            action: "view",
            viewedAt: { $gte: sd, $lte: ed },
          },
        },
        {
          $group: {
            _id: "$movieId",
            movieTitle: { $first: "$movieTitle" },
            uniqueViewers: { $addToSet: { $ifNull: ["$userId", "$sessionId"] } },
          },
        },
        {
          $project: {
            movieId: "$_id",
            movieTitle: 1,
            views: { $size: "$uniqueViewers" },
            uniqueViewers: { $size: "$uniqueViewers" },
          },
        },
        { $sort: { views: -1 } },
        { $limit: limit },
      ];
    } else if (metric === "watch_time") {
      pipeline = [
        {
          $match: {
            watchDate: {
              $gte: sd.toISOString().split("T")[0],
              $lte: ed.toISOString().split("T")[0],
            },
          },
        },
        {
          $group: {
            _id: "$movieId",
            movieTitle: { $first: "$movieTitle" },
            totalWatchTime: { $sum: "$watchedSeconds" },
          },
        },
        {
          $project: {
            movieId: "$_id",
            movieTitle: 1,
            views: "$totalWatchTime",
            uniqueViewers: 0,
          },
        },
        { $sort: { views: -1 } },
        { $limit: limit },
      ];
    } else {
      pipeline = [
        {
          $match: {
            action: "view",
            viewedAt: { $gte: sd, $lte: ed },
          },
        },
        {
          $group: {
            _id: "$movieId",
            movieTitle: { $first: "$movieTitle" },
            views: { $sum: 1 },
            uniqueViewers: { $addToSet: { $ifNull: ["$userId", "$sessionId"] } },
          },
        },
        {
          $project: {
            movieId: "$_id",
            movieTitle: 1,
            views: 1,
            uniqueViewers: { $size: "$uniqueViewers" },
          },
        },
        { $sort: { views: -1 } },
        { $limit: limit },
      ];
    }

    const results = await MovieViewLog.aggregate(pipeline);
    return results.map((r) => ({
      movieId: r.movieId,
      movieTitle: r.movieTitle || r.movieId,
      views: r.views,
      uniqueViewers: r.uniqueViewers,
    }));
  }

  /**
   * B2: Get trending movies (comparing current period vs previous)
   */
  async getTrendingMovies(
    limit = 10,
    range: TimeRange = "7d",
    startDate?: string,
    endDate?: string
  ): Promise<TrendingMovie[]> {
    let periodMs: number;

    switch (range) {
      case "24h":
        periodMs = 24 * 60 * 60 * 1000;
        break;
      case "30d":
        periodMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case "90d":
        periodMs = 90 * 24 * 60 * 60 * 1000;
        break;
      default:
        periodMs = 7 * 24 * 60 * 60 * 1000;
    }

    let currentStart: Date;
    let previousStart: Date;
    let endDateObj: Date;

    if (startDate && endDate) {
      endDateObj = new Date(endDate);
      const duration = endDateObj.getTime() - new Date(startDate).getTime();
      currentStart = new Date(startDate);
      previousStart = new Date(currentStart.getTime() - duration);
    } else {
      endDateObj = new Date();
      currentStart = new Date(endDateObj.getTime() - periodMs);
      previousStart = new Date(currentStart.getTime() - periodMs);
    }

    const [current, previous] = await Promise.all([
      MovieViewLog.aggregate([
        {
          $match: {
            action: "view",
            viewedAt: { $gte: currentStart, $lte: endDateObj },
          },
        },
        {
          $group: {
            _id: "$movieId",
            movieTitle: { $first: "$movieTitle" },
            views: { $sum: 1 },
          },
        },
      ]),
      MovieViewLog.aggregate([
        {
          $match: {
            action: "view",
            viewedAt: { $gte: previousStart, $lt: currentStart },
          },
        },
        { $group: { _id: "$movieId", views: { $sum: 1 } } },
      ]),
    ]);

    const prevMap = new Map(previous.map((p) => [p._id, p.views]));

    const combined = current.map((c) => {
      const prevViews = prevMap.get(c._id) || 0;
      const changePercent =
        prevViews > 0
          ? Math.round(((c.views - prevViews) / prevViews) * 10000) / 100
          : 100;
      const trend =
        changePercent > 5 ? "up" : changePercent < -5 ? "down" : "stable";

      return {
        movieId: c._id,
        movieTitle: c.movieTitle || c._id,
        views: c.views,
        trend: trend as "up" | "down" | "stable",
        changePercent,
      };
    });

    return combined.sort((a, b) => b.views - a.views).slice(0, limit);
  }

  /**
   * B3: Get views breakdown by source
   */
  async getViewsBySource(range: TimeRange = "30d"): Promise<ViewSourceStats[]> {
    const { startDate, endDate } = getDateRange(range);

    const results = await MovieViewLog.aggregate([
      {
        $match: {
          viewedAt: { $gte: startDate, $lte: endDate },
        },
      },
      { $group: { _id: "$source", views: { $sum: 1 } } },
    ]);

    const total = results.reduce((sum, r) => sum + r.views, 0);

    return results.map((r) => ({
      source: r._id,
      views: r.views,
      percentage: total > 0 ? Math.round((r.views / total) * 10000) / 100 : 0,
    }));
  }

  /**
   * B4: Get completion rate for movies
   */
  async getCompletionRate(
    limit = 20,
    minViews = 10
  ): Promise<CompletionRateStats[]> {
    const results = await WatchHistory.aggregate([
      { $match: { deletedAt: null } },
      {
        $group: {
          _id: "$movieId",
          movieTitle: { $first: "$movieTitle" },
          totalStarted: { $sum: 1 },
          totalCompleted: { $sum: { $cond: ["$completed", 1, 0] } },
        },
      },
      { $match: { totalStarted: { $gte: minViews } } },
      {
        $project: {
          movieId: "$_id",
          movieTitle: 1,
          totalStarted: 1,
          totalCompleted: 1,
          completionRate: {
            $multiply: [{ $divide: ["$totalCompleted", "$totalStarted"] }, 100],
          },
        },
      },
      { $sort: { completionRate: -1 as const } },
      { $limit: limit },
    ]);

    return results.map((r) => ({
      movieId: r.movieId,
      movieTitle: r.movieTitle,
      totalStarted: r.totalStarted,
      totalCompleted: r.totalCompleted,
      completionRate: Math.round(r.completionRate * 100) / 100,
    }));
  }

  /**
   * B5: Get average watch time statistics
   */
  async getWatchTimeStats(range: TimeRange = "30d"): Promise<WatchTimeStats> {
    const { startDate, endDate } = getDateRange(range);

    const results = await WatchSession.aggregate([
      {
        $match: {
          watchDate: {
            $gte: startDate.toISOString().split("T")[0],
            $lte: endDate.toISOString().split("T")[0],
          },
        },
      },
      {
        $group: {
          _id: null,
          totalWatchTime: { $sum: "$watchedSeconds" },
          avgWatchTime: { $avg: "$watchedSeconds" },
        },
      },
    ]);

    if (results.length === 0) {
      return {
        avgWatchTimeSeconds: 0,
        avgWatchTimeFormatted: "0m",
        totalWatchTimeSeconds: 0,
        totalWatchTimeFormatted: "0h",
      };
    }

    const total = results[0].totalWatchTime;
    const avg = Math.round(results[0].avgWatchTime || 0);

    const formatTime = (seconds: number): string => {
      if (seconds < 60) return `${seconds}s`;
      if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
      const hours = Math.floor(seconds / 3600);
      const mins = Math.round((seconds % 3600) / 60);
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    return {
      avgWatchTimeSeconds: avg,
      avgWatchTimeFormatted: formatTime(avg),
      totalWatchTimeSeconds: total,
      totalWatchTimeFormatted: formatTime(total),
    };
  }

  /**
   * B6: Get drop-off analysis (where users stop watching)
   */
  async getDropOffAnalysis(
    movieId?: string,
    limit = 10
  ): Promise<DropOffPoint[]> {
    const match: Record<string, unknown> = { deletedAt: null };
    if (movieId) {
      match.movieId = movieId;
    }

    const results = await WatchHistory.aggregate([
      { $match: match },
      {
        $match: {
          progress: { $gt: 0 },
          duration: { $gt: 0 },
        },
      },
      {
        $project: {
          progressPercent: {
            $min: [
              { $multiply: [{ $divide: ["$progress", "$duration"] }, 100] },
              100,
            ],
          },
        },
      },
      {
        $bucket: {
          groupBy: "$progressPercent",
          boundaries: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 101],
          default: "other",
          output: { count: { $sum: 1 } },
        },
      },
    ]);

    const total = results.reduce((sum, r) => sum + r.count, 0);

    return results
      .filter((r) => r._id !== "other" && r._id !== 101)
      .map((r) => ({
        progressPercent: r._id as number,
        userCount: r.count,
        percentage: total > 0 ? Math.round((r.count / total) * 10000) / 100 : 0,
      }))
      .slice(0, limit);
  }

  /**
   * Get full engagement stats for a movie
   */
  async getMovieEngagement(movieId: string): Promise<MovieEngagementStats> {
    const [viewStats, favoriteCount, commentCount, shareCount, watchlistCount, completionData] =
      await Promise.all([
        MovieViewLog.aggregate([
          { $match: { movieId, action: "view" } },
          { $group: { _id: null, views: { $sum: 1 } } },
        ]),
        Favorite.countDocuments({ movieId }),
        Comment.countDocuments({ movieSlug: movieId, isDeleted: false }),
        MovieViewLog.countDocuments({ movieId, action: "share" }),
        MovieViewLog.countDocuments({ movieId, action: "watchlist" }),
        WatchHistory.aggregate([
          {
            $match: { movieId, deletedAt: null },
          },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              completed: { $sum: { $cond: ["$completed", 1, 0] } },
            },
          },
        ]),
      ]);

    const views = viewStats[0]?.views || 0;
    const totalStarted = completionData[0]?.total || 0;
    const totalCompleted = completionData[0]?.completed || 0;

    return {
      movieId,
      movieTitle: "",
      views,
      favorites: favoriteCount,
      comments: commentCount,
      shares: shareCount,
      watchlistAdds: watchlistCount,
      completionRate:
        totalStarted > 0
          ? Math.round((totalCompleted / totalStarted) * 10000) / 100
          : 0,
    };
  }

  // ============================================
  // C. ENGAGEMENT ANALYTICS
  // ============================================

  /**
   * C1: Get favorite statistics
   */
  async getFavoriteStats(range: TimeRange = "30d"): Promise<FavoriteStats> {
    const { startDate, endDate } = getDateRange(range);

    const [total, topMovies, byType, bySource] = await Promise.all([
      Favorite.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Favorite.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: "$movieId", movieTitle: { $first: "$movieTitle" }, count: { $sum: 1 } } },
        { $sort: { count: -1 as const } },
        { $limit: 10 },
        { $project: { movieId: "$_id", movieTitle: 1, count: 1 } },
      ]),
      Favorite.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: "$movieType", count: { $sum: 1 } } },
      ]),
      Favorite.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),
    ]);

    const typeMap: Record<string, number> = { single: 0, series: 0 };
    byType.forEach((t) => {
      if (t._id) typeMap[t._id] = t.count;
    });

    const sourceMap: Record<string, number> = {};
    bySource.forEach((s) => {
      sourceMap[s._id] = s.count;
    });

    return {
      totalFavorites: total,
      topFavoritedMovies: topMovies,
      byType: {
        single: typeMap.single,
        series: typeMap.series,
      },
      bySource: sourceMap,
    };
  }

  /**
   * C2: Get comment statistics
   */
  async getCommentStats(range: TimeRange = "30d"): Promise<CommentStats> {
    const { startDate, endDate } = getDateRange(range);

    const [total, topMovies, repliesCount] = await Promise.all([
      Comment.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: false,
      }),
      Comment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            isDeleted: false,
            parentId: null,
          },
        },
        { $group: { _id: "$movieSlug", count: { $sum: 1 } } },
        { $sort: { count: -1 as const } },
        { $limit: 10 },
      ]),
      Comment.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        isDeleted: false,
        parentId: { $ne: null },
      }),
    ]);

    const uniqueMovies = topMovies.length;

    return {
      totalComments: total,
      topMoviesByComments: topMovies,
      avgCommentsPerMovie: uniqueMovies > 0 ? Math.round((total / uniqueMovies) * 100) / 100 : 0,
      repliesCount,
    };
  }

  /**
   * C3: Get like statistics
   */
  async getLikeStats(range: TimeRange = "30d", limit = 10): Promise<LikeStats> {
    const { startDate, endDate } = getDateRange(range);

    const [total, avgLikes, topComments] = await Promise.all([
      Comment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            isDeleted: false,
            likes: { $gt: 0 },
          },
        },
        { $group: { _id: null, total: { $sum: "$likes" } } },
      ]),
      Comment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            isDeleted: false,
          },
        },
        { $group: { _id: null, avg: { $avg: "$likes" } } },
      ]),
      Comment.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            isDeleted: false,
            likes: { $gt: 0 },
          },
        },
        { $sort: { likes: -1 as const } },
        { $limit: limit },
        { $project: { commentId: "$_id", movieSlug: 1, likes: 1, userName: 1 } },
      ]),
    ]);

    return {
      totalLikes: total[0]?.total || 0,
      topLikedComments: topComments,
      avgLikesPerComment: Math.round((avgLikes[0]?.avg || 0) * 100) / 100,
    };
  }

  /**
   * C4: Get share statistics
   */
  async getShareStats(range: TimeRange = "30d"): Promise<ShareStats> {
    const { startDate, endDate } = getDateRange(range);

    const [total, topMovies, bySource] = await Promise.all([
      MovieViewLog.countDocuments({
        action: "share",
        viewedAt: { $gte: startDate, $lte: endDate },
      }),
      MovieViewLog.aggregate([
        {
          $match: {
            action: "share",
            viewedAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: "$movieId", count: { $sum: 1 } } },
        { $sort: { count: -1 as const } },
        { $limit: 10 },
      ]),
      MovieViewLog.aggregate([
        {
          $match: {
            action: "share",
            viewedAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: "$source", count: { $sum: 1 } } },
      ]),
    ]);

    const sourceMap: Record<string, number> = {};
    bySource.forEach((s) => {
      sourceMap[s._id] = s.count;
    });

    return {
      totalShares: total,
      topSharedMovies: topMovies,
      sharesBySource: sourceMap,
    };
  }

  /**
   * C5: Get watchlist statistics
   */
  async getWatchlistStats(range: TimeRange = "30d"): Promise<WatchlistStats> {
    const { startDate, endDate } = getDateRange(range);

    const [adds, removes, topMovies] = await Promise.all([
      MovieViewLog.countDocuments({
        action: "watchlist",
        viewedAt: { $gte: startDate, $lte: endDate },
      }),
      MovieViewLog.countDocuments({
        action: "unwatchlist",
        viewedAt: { $gte: startDate, $lte: endDate },
      }),
      MovieViewLog.aggregate([
        {
          $match: {
            action: { $in: ["watchlist", "unwatchlist"] },
            viewedAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: {
              movieId: "$movieId",
              action: "$action",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.movieId",
            actions: {
              $push: { action: "$_id.action", count: "$count" },
            },
          },
        },
        {
          $project: {
            movieId: "$_id",
            addCount: {
              $let: {
                vars: {
                  add: { $arrayElemAt: [{ $filter: { input: "$actions", cond: { $eq: ["$$this.action", "watchlist"] } } }, 0] },
                },
                in: { $ifNull: ["$$add.count", 0] },
              },
            },
            removeCount: {
              $let: {
                vars: {
                  remove: { $arrayElemAt: [{ $filter: { input: "$actions", cond: { $eq: ["$$this.action", "unwatchlist"] } } }, 0] },
                },
                in: { $ifNull: ["$$remove.count", 0] },
              },
            },
          },
        },
        {
          $project: {
            movieId: 1,
            netChange: { $subtract: ["$addCount", "$removeCount"] },
            addCount: 1,
            removeCount: 1,
          },
        },
        { $sort: { addCount: -1 as const } },
        { $limit: 10 },
      ]),
    ]);

    return {
      totalAdds: adds,
      totalRemoves: removes,
      netChange: adds - removes,
      topWatchlistedMovies: topMovies,
    };
  }

  // ============================================
  // D. CHECK-IN & GAMIFICATION ANALYTICS
  // ============================================

  /**
   * D1: Get check-in streak leaderboard
   */
  async getStreakLeaderboard(limit = 10): Promise<CheckInStreakStats[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const checkIns = await DailyCheckIn.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo.toISOString().split("T")[0] } } },
      {
        $group: {
          _id: "$userId",
          totalCheckIns: { $sum: 1 },
        },
      },
      { $sort: { totalCheckIns: -1 as const } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          userId: "$_id",
          userName: "$user.name",
          totalCheckIns: 1,
          currentStreak: "$totalCheckIns",
          longestStreak: "$totalCheckIns",
        },
      },
    ]);

    return checkIns;
  }

  /**
   * D2: Get check-in heatmap data
   */
  async getCheckInHeatmap(year: number, month: number): Promise<CheckInHeatmapData[]> {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = new Date(year, month, 0).toISOString().split("T")[0];

    const results = await DailyCheckIn.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: "$date",
          count: { $sum: 1 },
          users: { $addToSet: "$userId" },
        },
      },
      { $sort: { _id: 1 as const } },
    ]);

    return results.map((r) => ({
      date: r._id,
      count: r.count,
      users: r.users.length,
    }));
  }

  /**
   * D3: Get badge distribution
   */
  async getBadgeDistribution(): Promise<BadgeDistribution[]> {
    const totalBadges = await UserBadge.countDocuments();

    const results = await UserBadge.aggregate([
      { $group: { _id: "$badgeId", totalEarned: { $sum: 1 } } },
      { $sort: { totalEarned: -1 as const } },
    ]);

    return results.map((r) => ({
      badgeId: r._id,
      badgeName: r._id,
      totalEarned: r.totalEarned,
      percentage:
        totalBadges > 0 ? Math.round((r.totalEarned / totalBadges) * 10000) / 100 : 0,
    }));
  }

  /**
   * D4: Get watch time leaderboard
   */
  async getWatchTimeLeaderboard(
    period: "all" | "weekly" | "monthly" = "all",
    limit = 20
  ): Promise<AnalyticsLeaderboardEntry[]> {
    let sortField: string;
    switch (period) {
      case "weekly":
        sortField = "weeklyWatchSeconds";
        break;
      case "monthly":
        sortField = "monthlyWatchSeconds";
        break;
      default:
        sortField = "totalWatchSeconds";
    }

    const results = await UserWatchStats.aggregate([
      { $sort: { [sortField]: -1 as const } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: "$userId",
          userName: "$user.name",
          avatar: "$user.avatar",
          watchSeconds: `$${sortField}`,
          watchHours: { $round: [{ $divide: [`$${sortField}`, 3600] }, 2] },
        },
      },
    ]);

    return results.map((r, index) => ({
      rank: index + 1,
      userId: r.userId?.toString() || "",
      userName: r.userName || "Anonymous",
      avatar: r.avatar,
      watchSeconds: r.watchSeconds,
      watchHours: r.watchHours,
    }));
  }

  // ============================================
  // E. COLLECTION ANALYTICS
  // ============================================

  /**
   * E1: Get collection statistics
   */
  async getCollectionStats(): Promise<CollectionStats> {
    const [total, publicCount, avgItems, topCollections] = await Promise.all([
      Collection.countDocuments(),
      Collection.countDocuments({ isPublic: true }),
      Collection.aggregate([
        {
          $group: {
            _id: null,
            avgItems: { $avg: "$itemCount" },
          },
        },
      ]),
      Collection.aggregate([
        { $match: { isPublic: true } },
        { $sort: { itemCount: -1 as const } },
        { $limit: 10 },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            collectionId: "$_id",
            name: 1,
            itemCount: 1,
            userName: "$user.name",
          },
        },
      ]),
    ]);

    return {
      totalCollections: total,
      publicCollections: publicCount,
      privateCollections: total - publicCount,
      avgItemsPerCollection: Math.round((avgItems[0]?.avgItems || 0) * 100) / 100,
      topCollections,
    };
  }

  // ============================================
  // F. FEEDBACK & NOTIFICATION ANALYTICS
  // ============================================

  /**
   * F1 & F2: Get feedback statistics with resolution time
   */
  async getFeedbackStats(range: TimeRange = "30d"): Promise<FeedbackStats> {
    const { startDate, endDate } = getDateRange(range);

    const [
      total,
      pending,
      inProgress,
      resolved,
      rejected,
      byCategory,
      withResolutionTime,
    ] = await Promise.all([
      Feedback.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Feedback.countDocuments({
        status: FeedbackStatus.PENDING,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Feedback.countDocuments({
        status: FeedbackStatus.IN_PROGRESS,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Feedback.countDocuments({
        status: FeedbackStatus.RESOLVED,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Feedback.countDocuments({
        status: FeedbackStatus.REJECTED,
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      Feedback.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            repliedAt: { $exists: true, $ne: null },
          },
        },
        {
          $project: {
            resolutionTimeHours: {
              $divide: [
                { $subtract: ["$repliedAt", "$createdAt"] },
                3600000,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgResolutionTime: { $avg: "$resolutionTimeHours" },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const categoryMap: Record<string, number> = {};
    byCategory.forEach((c) => {
      categoryMap[c._id] = c.count;
    });

    return {
      total,
      pending,
      inProgress,
      resolved,
      rejected,
      byCategory: categoryMap,
      avgResolutionTimeHours:
        withResolutionTime[0]?.count > 0
          ? Math.round(withResolutionTime[0].avgResolutionTime * 100) / 100
          : null,
      avgResponseTimeHours: null,
    };
  }

  /**
   * F3: Get notification statistics
   */
  async getNotificationStats(range: TimeRange = "30d"): Promise<NotificationStats> {
    const { startDate, endDate } = getDateRange(range);

    const [total, byType, withReadStatus] = await Promise.all([
      Notification.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
      }),
      Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        { $group: { _id: "$type", count: { $sum: 1 } } },
      ]),
      Notification.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $project: {
            totalRecipients: { $size: "$recipients" },
            readCount: { $size: "$readBy" },
          },
        },
        {
          $group: {
            _id: null,
            totalRecipients: { $sum: "$totalRecipients" },
            totalRead: { $sum: "$readCount" },
          },
        },
      ]),
    ]);

    const typeMap: Record<string, number> = {};
    byType.forEach((t) => {
      typeMap[t._id] = t.count;
    });

    const totalRecipients = withReadStatus[0]?.totalRecipients || 0;
    const totalRead = withReadStatus[0]?.totalRead || 0;

    return {
      totalSent: total,
      byType: typeMap,
      avgReadRate:
        totalRecipients > 0
          ? Math.round((totalRead / totalRecipients) * 10000) / 100
          : 0,
    };
  }

  // ============================================
  // G. DASHBOARD SUMMARY
  // ============================================

  /**
   * Get dashboard overview for admin
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const today = getStartOfDay(new Date());
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      userStats,
      todayViews,
      weekViews,
      monthViews,
      todayCheckIns,
      totalWatchTime,
      pendingFeedback,
    ] = await Promise.all([
      this.getUserOverview(),
      MovieViewLog.countDocuments({
        action: "view",
        viewedAt: { $gte: today },
      }),
      MovieViewLog.countDocuments({
        action: "view",
        viewedAt: { $gte: thisWeekStart },
      }),
      MovieViewLog.countDocuments({
        action: "view",
        viewedAt: { $gte: thisMonthStart },
      }),
      DailyCheckIn.countDocuments({
        date: today.toISOString().split("T")[0],
      }),
      WatchSession.aggregate([
        {
          $match: {
            watchDate: today.toISOString().split("T")[0],
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$watchedSeconds" },
          },
        },
      ]),
      Feedback.countDocuments({ status: FeedbackStatus.PENDING }),
    ]);

    return {
      users: {
        total: userStats.totalUsers,
        newToday: await User.countDocuments({ createdAt: { $gte: today } }),
        active7d: userStats.activeUsers,
      },
      views: {
        today: todayViews,
        thisWeek: weekViews,
        thisMonth: monthViews,
      },
      engagement: {
        todayCheckIns,
        totalWatchTimeSeconds: totalWatchTime[0]?.total || 0,
        pendingFeedback,
      },
    };
  }
}

export const analyticsService = new AnalyticsService();
