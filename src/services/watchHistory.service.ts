import { WatchHistory, IWatchHistory } from '../models/index.js';
import { Types } from 'mongoose';

export interface CreateWatchHistoryDto {
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  progress: number;
  duration: number;
  completed?: boolean;
}

export interface UpdateWatchHistoryDto {
  progress?: number;
  duration?: number;
  completed?: boolean;
}

export class WatchHistoryService {
  async createOrUpdate(
    userId: string,
    data: CreateWatchHistoryDto
  ): Promise<IWatchHistory> {
    const result = await WatchHistory.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), movieId: data.movieId },
      {
        $set: {
          movieTitle: data.movieTitle,
          moviePoster: data.moviePoster,
          progress: data.progress,
          duration: data.duration,
          completed: data.completed ?? false,
          watchedAt: new Date(),
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    return result;
  }

  async update(
    userId: string,
    movieId: string,
    data: UpdateWatchHistoryDto
  ): Promise<IWatchHistory | null> {
    return WatchHistory.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), movieId },
      { $set: data },
      { new: true }
    );
  }

  async getByUserId(
    userId: string,
    options: { page?: number; limit?: number } = {}
  ): Promise<{ data: IWatchHistory[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      WatchHistory.find({ userId: new Types.ObjectId(userId) })
        .sort({ watchedAt: -1 })
        .skip(skip)
        .limit(limit),
      WatchHistory.countDocuments({ userId: new Types.ObjectId(userId) }),
    ]);

    return { data, total, page, limit };
  }

  async getByMovieId(userId: string, movieId: string): Promise<IWatchHistory | null> {
    return WatchHistory.findOne({
      userId: new Types.ObjectId(userId),
      movieId,
    });
  }

  async delete(userId: string, movieId: string): Promise<boolean> {
    const result = await WatchHistory.findOneAndDelete({
      userId: new Types.ObjectId(userId),
      movieId,
    });
    return !!result;
  }

  async deleteAll(userId: string): Promise<number> {
    const result = await WatchHistory.deleteMany({
      userId: new Types.ObjectId(userId),
    });
    return result.deletedCount ?? 0;
  }

  async getRecentlyWatched(
    userId: string,
    limit: number = 10
  ): Promise<IWatchHistory[]> {
    return WatchHistory.find({ userId: new Types.ObjectId(userId) })
      .sort({ watchedAt: -1 })
      .limit(limit);
  }

  async getContinueWatching(
    userId: string,
    limit: number = 10
  ): Promise<IWatchHistory[]> {
    return WatchHistory.find({
      userId: new Types.ObjectId(userId),
      completed: false,
      progress: { $gt: 0 },
    })
      .sort({ watchedAt: -1 })
      .limit(limit);
  }
}

export const watchHistoryService = new WatchHistoryService();
