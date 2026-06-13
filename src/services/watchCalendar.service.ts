import { Types } from 'mongoose';
import { WatchSession } from '../models/index.js';
import {
  formatVietnameseDate,
  secondsToHours,
  DEFAULT_TIMEZONE,
} from '../utils/date.utils.js';

export interface CalendarDaySummary {
  date: string;
  totalWatchSeconds: number;
  totalWatchHours: number;
  movieCount: number;
}

export interface CalendarMonthResult {
  year: number;
  month: number;
  activeDays: CalendarDaySummary[];
  monthTotalWatchSeconds: number;
  monthTotalWatchHours: number;
}

export interface CalendarDayEpisode {
  episodeSlug: string;
  episodeName: string | null;
  watchedSeconds: number;
  watchedHours: number;
  sessions: number;
}

export interface CalendarDayMovie {
  movieId: string;
  movieTitle: string;
  moviePoster: string | null;
  source: string;
  totalWatchSeconds: number;
  totalWatchHours: number;
  episodes: CalendarDayEpisode[];
}

export interface CalendarDayResult {
  date: string;
  formattedDate: string;
  totalWatchSeconds: number;
  totalWatchHours: number;
  movies: CalendarDayMovie[];
}

export class WatchCalendarService {
  async getMonthOverview(
    userId: string,
    year: number,
    month: number,
  ): Promise<CalendarMonthResult> {
    const monthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    const userObjectId = new Types.ObjectId(userId);

    const activeDays = await WatchSession.aggregate([
      {
        $match: {
          userId: userObjectId,
          watchDate: { $regex: `^${monthPrefix}` },
        },
      },
      {
        $group: {
          _id: '$watchDate',
          totalWatchSeconds: { $sum: '$watchedSeconds' },
          movieIds: { $addToSet: '$movieId' },
        },
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalWatchSeconds: 1,
          movieCount: { $size: '$movieIds' },
        },
      },
      { $sort: { date: 1 } },
    ]);

    const monthTotalWatchSeconds = activeDays.reduce(
      (sum: number, day: { totalWatchSeconds: number }) =>
        sum + day.totalWatchSeconds,
      0,
    );

    return {
      year,
      month,
      activeDays: activeDays.map((day) => ({
        date: day.date,
        totalWatchSeconds: day.totalWatchSeconds,
        totalWatchHours: secondsToHours(day.totalWatchSeconds),
        movieCount: day.movieCount,
      })),
      monthTotalWatchSeconds,
      monthTotalWatchHours: secondsToHours(monthTotalWatchSeconds),
    };
  }

  async getDayDetail(userId: string, date: string): Promise<CalendarDayResult> {
    const userObjectId = new Types.ObjectId(userId);

    const [movies, totalResult] = await Promise.all([
      WatchSession.aggregate([
        {
          $match: {
            userId: userObjectId,
            watchDate: date,
          },
        },
        {
          $group: {
            _id: {
              movieId: '$movieId',
              episodeSlug: '$episodeSlug',
            },
            movieTitle: { $first: '$movieTitle' },
            moviePoster: { $first: '$moviePoster' },
            source: { $first: '$source' },
            episodeName: { $first: '$episodeName' },
            watchedSeconds: { $sum: '$watchedSeconds' },
            sessions: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: '$_id.movieId',
            movieTitle: { $first: '$movieTitle' },
            moviePoster: { $first: '$moviePoster' },
            source: { $first: '$source' },
            totalWatchSeconds: { $sum: '$watchedSeconds' },
            episodes: {
              $push: {
                episodeSlug: '$_id.episodeSlug',
                episodeName: '$episodeName',
                watchedSeconds: '$watchedSeconds',
                sessions: '$sessions',
              },
            },
          },
        },
        { $sort: { totalWatchSeconds: -1 } },
        {
          $project: {
            _id: 0,
            movieId: '$_id',
            movieTitle: 1,
            moviePoster: 1,
            source: 1,
            totalWatchSeconds: 1,
            episodes: 1,
          },
        },
      ]),
      WatchSession.aggregate([
        {
          $match: {
            userId: userObjectId,
            watchDate: date,
          },
        },
        {
          $group: {
            _id: null,
            totalWatchSeconds: { $sum: '$watchedSeconds' },
          },
        },
      ]),
    ]);

    const totalWatchSeconds = totalResult[0]?.totalWatchSeconds ?? 0;

    return {
      date,
      formattedDate: formatVietnameseDate(date),
      totalWatchSeconds,
      totalWatchHours: secondsToHours(totalWatchSeconds),
      movies: movies.map((movie) => ({
        movieId: movie.movieId,
        movieTitle: movie.movieTitle,
        moviePoster: movie.moviePoster ?? null,
        source: movie.source,
        totalWatchSeconds: movie.totalWatchSeconds,
        totalWatchHours: secondsToHours(movie.totalWatchSeconds),
        episodes: movie.episodes.map((ep: CalendarDayEpisode) => ({
          episodeSlug: ep.episodeSlug,
          episodeName: ep.episodeName ?? null,
          watchedSeconds: ep.watchedSeconds,
          watchedHours: secondsToHours(ep.watchedSeconds),
          sessions: ep.sessions,
        })),
      })),
    };
  }
}

export const watchCalendarService = new WatchCalendarService();

export { DEFAULT_TIMEZONE };
