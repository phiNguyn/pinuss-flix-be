import {
  MovieViewLog,
  IMovieViewLog,
  ViewAction,
  ViewSource,
} from "../models/index.js";
import https from "https";

export interface CreateViewLogDto {
  movieId: string;
  action: ViewAction;
  source?: ViewSource;
  sessionId?: string;
  userId?: string;
  metadata?: {
    episodeSlug?: string;
    episodeName?: string;
    progress?: number;
    duration?: number;
  };
}

export interface TrendingMovieResult {
  movieId: string;
  movieTitle?: string;
  moviePoster?: string;
  movieThumb?: string;
  year?: number;
  quality?: string;
  viewCount: number;
  source: ViewSource;
  lastViewed: Date;
}

// Cache for movie details (simple in-memory cache)
const movieCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function fetchMovieFromOphim(movieId: string): Promise<{
  name: string;
  origin_name: string;
  thumb_url: string;
  poster_url: string;
  year: number;
  quality: string;
} | null> {
  // Check cache first
  const cached = movieCache.get(movieId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const data = await new Promise<any>((resolve, reject) => {
      const url = `https://ophim1.com/phim/${movieId}`;
      https
        .get(url, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error("Invalid JSON response"));
            }
          });
        })
        .on("error", reject);
    });

    if (data?.status && data?.movie) {
      const movieData = {
        name: data.movie.name,
        origin_name: data.movie.origin_name,
        thumb_url: data.movie.thumb_url,
        poster_url: data.movie.poster_url,
        year: data.movie.year,
        quality: data.movie.quality,
      };

      // Cache the result
      movieCache.set(movieId, {
        data: movieData,
        expiresAt: Date.now() + CACHE_TTL,
      });

      return movieData;
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch movie ${movieId} from Ophim:`, error);
    return null;
  }
}

async function fetchMovieFromPhimapi(movieId: string): Promise<{
  name: string;
  origin_name: string;
  thumb_url: string;
  poster_url: string;
  year: number;
  quality: string;
} | null> {
  // Check cache first
  const cacheKey = `phimapi:${movieId}`;
  const cached = movieCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  try {
    const data = await new Promise<any>((resolve, reject) => {
      const url = `https://phimapi.com/phim/${movieId}`;
      https
        .get(url, (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error("Invalid JSON response"));
            }
          });
        })
        .on("error", reject);
    });

    if (data?.status && data?.movie) {
      const movieData = {
        name: data.movie.name,
        origin_name: data.movie.origin_name,
        thumb_url: data.movie.thumb_url,
        poster_url: data.movie.poster_url,
        year: data.movie.year,
        quality: data.movie.quality,
      };

      // Cache the result
      movieCache.set(cacheKey, {
        data: movieData,
        expiresAt: Date.now() + CACHE_TTL,
      });

      return movieData;
    }

    return null;
  } catch (error) {
    console.error(`Failed to fetch movie ${movieId} from Phimapi:`, error);
    return null;
  }
}

export class MovieViewLogService {
  /**
   * Log a view event (for both anonymous and logged in users)
   * Prevents duplicate entries based on sessionId, movieId, metadata, and source for today
   */
  async logView(data: CreateViewLogDto): Promise<IMovieViewLog> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(today);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Build query to check for existing log with same sessionId/userId, movieId, source, and metadata
    const query: any = {
      movieId: data.movieId,
      source: data.source ?? "ophim",
      action: data.action,
      viewedAt: { $gte: today, $lt: tomorrowStart }, // Same day
    };

    // Identify user type (sessionId for anonymous, userId for logged in)
    if (data.userId) {
      query.userId = data.userId;
    } else if (data.sessionId) {
      query.sessionId = data.sessionId;
    } else {
      // No sessionId and no userId - skip dedup check, create new entry
      const log = new MovieViewLog({
        movieId: data.movieId,
        action: data.action,
        source: data.source ?? "ophim",
        sessionId: data.sessionId,
        userId: data.userId,
        metadata: data.metadata,
        viewedAt: new Date(),
      });
      return log.save();
    }

    // Check for metadata match
    if (data.metadata) {
      if (data.metadata?.episodeSlug) {
        query["metadata.episodeSlug"] = data.metadata.episodeSlug;
      }

      if (data.metadata?.episodeName) {
        query["metadata.episodeName"] = data.metadata.episodeName;
      }
    } else {
      // If no metadata provided, only match logs without metadata
      query.metadata = { $exists: false };
    }

    // Check if such a log already exists today
    const existingLog = await MovieViewLog.findOne(query).sort({ _id: -1 });

    if (existingLog) {
      console.log(
        `[MovieViewLog] Duplicate prevented: ${data.sessionId || data.userId} - Movie: ${data.movieId} - Source: ${data.source}`,
      );
      return existingLog; // Return existing log instead of creating new one
    }

    // Create new log if no duplicate found
    const log = new MovieViewLog({
      movieId: data.movieId,
      action: data.action,
      source: data.source ?? "ophim",
      sessionId: data.sessionId,
      userId: data.userId,
      metadata: data.metadata,
      viewedAt: new Date(),
    });

    return log.save();
  }

  /**
   * Get trending movies based on view logs
   * @param limit - Number of movies to return
   * @param hoursBack - How many hours back to look (default: 24 hours, max: 168 = 1 week)
   */
  async getTrendingMovies(
    limit: number = 10,
    hoursBack: number = 24,
  ): Promise<TrendingMovieResult[]> {
    // Limit to 1 week max
    const validHoursBack = Math.min(hoursBack, 168);
    const since = new Date(Date.now() - validHoursBack * 60 * 60 * 1000);

    const trending = await MovieViewLog.aggregate([
      {
        $match: {
          // viewedAt: { $gte: since },
          // action: { $in: ["view", "play", '', "complete"] }, // Chỉ đếm view và complete
        },
      },
      {
        $group: {
          _id: "$movieId",
          viewCount: { $sum: 1 },
          source: { $last: "$source" },
          lastViewed: { $max: "$viewedAt" },
        },
      },
      { $sort: { viewCount: -1 } },
      { $limit: limit },
    ]);

    // Enrich with movie details based on source
    const enrichedResults: TrendingMovieResult[] = await Promise.all(
      trending.map(async (item) => {
        const result: TrendingMovieResult = {
          movieId: item._id as string,
          viewCount: item.viewCount,
          source: item.source,
          lastViewed: item.lastViewed,
        };

        // Fetch movie details based on source
        if (item.source === "ophim") {
          const movieData = await fetchMovieFromOphim(item._id as string);
          if (movieData) {
            result.movieTitle = movieData.name;
            result.moviePoster = movieData.thumb_url;
            result.movieThumb = movieData.poster_url;
            result.year = movieData.year;
            result.quality = movieData.quality;
          }
        } else if (item.source === "phimapi") {
          const movieData = await fetchMovieFromPhimapi(item._id as string);
          if (movieData) {
            result.movieTitle = movieData.name;
            result.moviePoster = movieData.poster_url;
            result.movieThumb = movieData.thumb_url;
            result.year = movieData.year;
            result.quality = movieData.quality;
          }
        }

        return result;
      }),
    );

    return enrichedResults;
  }

  /**
   * Get movie statistics
   */
  async getMovieStats(movieId: string): Promise<{
    totalViews: number;
    views24h: number;
    views7d: number;
    favorites: number;
    watchlist: number;
  }> {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [stats] = await MovieViewLog.aggregate([
      { $match: { movieId } },
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
        },
      },
    ]);

    const statsMap = stats.reduce(
      (acc: Record<string, number>, curr: { _id: string; count: number }) => {
        acc[curr._id] = curr.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    const views24h = await MovieViewLog.countDocuments({
      movieId,
      action: { $in: ["view", "complete"] },
      viewedAt: { $gte: last24h },
    });

    const views7d = await MovieViewLog.countDocuments({
      movieId,
      action: { $in: ["view", "complete"] },
      viewedAt: { $gte: last7d },
    });

    return {
      totalViews: (statsMap["view"] || 0) + (statsMap["complete"] || 0),
      views24h,
      views7d,
      favorites: statsMap["favorite"] || 0,
      watchlist: statsMap["watchlist"] || 0,
    };
  }

  /**
   * Merge anonymous session data to user when they login/register
   */
  async mergeSessionToUser(
    sessionId: string,
    userId: string,
  ): Promise<{ mergedCount: number }> {
    if (!sessionId || !userId) {
      return { mergedCount: 0 };
    }

    // Update all logs from this session to add userId
    // Keep sessionId for analytics purposes
    const result = await MovieViewLog.updateMany(
      { sessionId, userId: { $exists: false } },
      {
        $set: {
          userId,
          viewedAt: new Date(), // Update viewedAt to reflect merge time
        },
      },
    );

    return { mergedCount: result.modifiedCount };
  }

  /**
   * Get user view history (logged in users only)
   */
  async getUserViewHistory(
    userId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{
    data: IMovieViewLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      MovieViewLog.find({ userId })
        .sort({ viewedAt: -1 })
        .skip(skip)
        .limit(limit),
      MovieViewLog.countDocuments({ userId }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Get session view history (anonymous users)
   */
  async getSessionViewHistory(
    sessionId: string,
    options: { page?: number; limit?: number } = {},
  ): Promise<{
    data: IMovieViewLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      MovieViewLog.find({ sessionId, userId: { $exists: false } })
        .sort({ viewedAt: -1 })
        .skip(skip)
        .limit(limit),
      MovieViewLog.countDocuments({
        sessionId,
        userId: { $exists: false },
      }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Clean up old anonymous data (optional, for data retention)
   */
  async cleanupOldAnonymousData(daysOld: number = 90): Promise<number> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const result = await MovieViewLog.deleteMany({
      sessionId: { $exists: true, $ne: null },
      userId: { $exists: false },
      viewedAt: { $lt: cutoff },
    });

    return result.deletedCount;
  }
}

export const movieViewLogService = new MovieViewLogService();
