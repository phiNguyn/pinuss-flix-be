import { Types } from 'mongoose';
import {
  WatchSession,
  IWatchSession,
  UserWatchStats,
  WatchHistorySource,
} from '../models/index.js';
import {
  getWatchDate,
  getMonthKey,
  getWeekStartDate,
  secondsToHours,
  DEFAULT_TIMEZONE,
} from '../utils/date.utils.js';

const MAX_WATCH_SECONDS_PER_REQUEST = 120;

export interface CreateWatchSessionDto {
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  originName?: string;
  year?: number;
  source?: WatchHistorySource;
  episodeSlug: string;
  episodeName?: string;
  watchedSeconds: number;
  progressStart?: number;
  progressEnd?: number;
  timezone?: string;
}

export interface UserWatchStatsSummary {
  totalWatchSeconds: number;
  totalWatchHours: number;
  weeklyWatchSeconds: number;
  weeklyWatchHours: number;
  monthlyWatchSeconds: number;
  monthlyWatchHours: number;
  lastWatchedAt: Date | null;
}

export class WatchSessionService {
  async recordSession(
    userId: string,
    data: CreateWatchSessionDto,
  ): Promise<IWatchSession> {
    if (data.watchedSeconds <= 0) {
      throw new Error('watchedSeconds must be greater than 0');
    }

    if (data.watchedSeconds > MAX_WATCH_SECONDS_PER_REQUEST) {
      throw new Error(
        `watchedSeconds cannot exceed ${MAX_WATCH_SECONDS_PER_REQUEST} seconds per request`,
      );
    }

    const timezone = data.timezone ?? DEFAULT_TIMEZONE;
    const now = new Date();
    const watchDate = getWatchDate(now, timezone);
    const userObjectId = new Types.ObjectId(userId);

    const session = await WatchSession.create({
      userId: userObjectId,
      movieId: data.movieId,
      movieTitle: data.movieTitle,
      moviePoster: data.moviePoster,
      originName: data.originName,
      year: data.year,
      source: data.source ?? 'ophim',
      episodeSlug: data.episodeSlug,
      episodeName: data.episodeName,
      watchedSeconds: data.watchedSeconds,
      progressStart: data.progressStart,
      progressEnd: data.progressEnd,
      watchDate,
      startedAt: new Date(now.getTime() - data.watchedSeconds * 1000),
      endedAt: now,
    });

    await this.updateUserStats(userObjectId, data.watchedSeconds, timezone, now);

    return session;
  }

  private async updateUserStats(
    userId: Types.ObjectId,
    watchedSeconds: number,
    timezone: string,
    now: Date,
  ): Promise<void> {
    const monthKey = getMonthKey(now, timezone);
    const weekStartDate = getWeekStartDate(now, timezone);

    let stats = await UserWatchStats.findOne({ userId });

    if (!stats) {
      await UserWatchStats.create({
        userId,
        totalWatchSeconds: watchedSeconds,
        weeklyWatchSeconds: watchedSeconds,
        monthlyWatchSeconds: watchedSeconds,
        weekStartDate,
        monthKey,
        lastWatchedAt: now,
      });
      return;
    }

    stats.totalWatchSeconds += watchedSeconds;
    stats.lastWatchedAt = now;

    if (stats.monthKey !== monthKey) {
      stats.monthlyWatchSeconds = watchedSeconds;
      stats.monthKey = monthKey;
    } else {
      stats.monthlyWatchSeconds += watchedSeconds;
    }

    if (stats.weekStartDate !== weekStartDate) {
      stats.weeklyWatchSeconds = watchedSeconds;
      stats.weekStartDate = weekStartDate;
    } else {
      stats.weeklyWatchSeconds += watchedSeconds;
    }

    await stats.save();
  }

  async getMyStats(userId: string): Promise<UserWatchStatsSummary> {
    const stats = await UserWatchStats.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!stats) {
      return {
        totalWatchSeconds: 0,
        totalWatchHours: 0,
        weeklyWatchSeconds: 0,
        weeklyWatchHours: 0,
        monthlyWatchSeconds: 0,
        monthlyWatchHours: 0,
        lastWatchedAt: null,
      };
    }

    return {
      totalWatchSeconds: stats.totalWatchSeconds,
      totalWatchHours: secondsToHours(stats.totalWatchSeconds),
      weeklyWatchSeconds: stats.weeklyWatchSeconds,
      weeklyWatchHours: secondsToHours(stats.weeklyWatchSeconds),
      monthlyWatchSeconds: stats.monthlyWatchSeconds,
      monthlyWatchHours: secondsToHours(stats.monthlyWatchSeconds),
      lastWatchedAt: stats.lastWatchedAt,
    };
  }
}

export const watchSessionService = new WatchSessionService();
