import { WatchHistory, IWatchHistory, WatchHistorySource } from '../models/index.js';
import { Types } from 'mongoose';

export interface CreateWatchHistoryDto {
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  // Additional movie info
  originName?: string;
  episodeCurrent?: string;
  year?: number;
  quality?: string;
  // Progress info
  progress: number;
  duration: number;
  completed?: boolean;
  // Episode info
  currentEpSlug?: string;
  currentEpName?: string;
  // Source
  source?: WatchHistorySource;
}

export interface UpdateWatchHistoryDto {
  progress?: number;
  duration?: number;
  completed?: boolean;
  // Additional movie info (for upsert)
  movieTitle?: string;
  moviePoster?: string;
  originName?: string;
  episodeCurrent?: string;
  year?: number;
  quality?: string;
  // Episode info
  currentEpSlug?: string;
  currentEpName?: string;
  // Source
  source?: WatchHistorySource;
}

export class WatchHistoryService {
  async getTrendingMovies(limit: number = 10): Promise<
    {
      movieId: string;
      movieTitle: string;
      moviePoster?: string;
      year?: number;
      quality?: string;
      watchCount: number;
    }[]
  > {
    const result = await WatchHistory.aggregate([
      // Chỉ lấy những record chưa bị xóa
      // { $match: { deletedAt: null } },
      // Nhóm theo movieId
      {
        $group: {
          _id: "$movieId",
          movieTitle: { $first: "$movieTitle" },
          moviePoster: { $first: "$moviePoster" },
          year: { $first: "$year" },
          quality: { $first: "$quality" },
          watchCount: { $sum: 1 },
        },
      },
      // Sắp xếp theo watchCount giảm dần
      { $sort: { watchCount: -1 } },
      // Giới hạn kết quả
      { $limit: limit },
      // Đổi tên field cho đẹp
      {
        $project: {
          _id: 0,
          movieId: "$_id",
          movieTitle: 1,
          moviePoster: 1,
          year: 1,
          quality: 1,
          watchCount: 1,
        },
      },
    ]);

    return result;
  }

  async createOrUpdate(
    userId: string,
    data: CreateWatchHistoryDto,
  ): Promise<IWatchHistory> {
    const result = await WatchHistory.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        movieId: data.movieId,
        // Chỉ tìm record chưa bị xóa, hoặc đã bị xóa mềm để khôi phục
        $or: [{ deletedAt: null }, { deletedAt: { $ne: null } }],
      },
      {
        $set: {
          movieTitle: data.movieTitle,
          moviePoster: data.moviePoster,
          originName: data.originName,
          episodeCurrent: data.episodeCurrent,
          year: data.year,
          quality: data.quality,
          progress: data.progress,
          duration: data.duration,
          completed: data.completed ?? false,
          currentEpSlug: data.currentEpSlug,
          currentEpName: data.currentEpName,
          source: data.source ?? "ophim",
          watchedAt: new Date(),
          // Khôi phục nếu đã bị xóa mềm
          deletedAt: null,
        },
      },
      { upsert: true, new: true, runValidators: true },
    );

    return result;
  }

  async update(
    userId: string,
    movieId: string,
    data: UpdateWatchHistoryDto,
  ): Promise<IWatchHistory | null> {
    return WatchHistory.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), movieId },
      {
        $set: {
          ...data,
          watchedAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );
  }

  async getByUserId(
    userId: string,
    options: { page?: number; limit?: number; includeDeleted?: boolean } = {},
  ): Promise<{
    data: IWatchHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 20, includeDeleted = false } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };
    if (!includeDeleted) {
      filter.deletedAt = null;
    }

    const [data, total] = await Promise.all([
      WatchHistory.find(filter).sort({ watchedAt: -1 }).skip(skip).limit(limit),
      WatchHistory.countDocuments(filter),
    ]);

    return { data, total, page, limit };
  }

  async getByMovieId(
    userId: string,
    movieId: string,
  ): Promise<IWatchHistory | null> {
    return WatchHistory.findOne({
      userId: new Types.ObjectId(userId),
      movieId,
      deletedAt: null,
    });
  }

  async softDelete(userId: string, movieId: string): Promise<boolean> {
    const result = await WatchHistory.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        movieId,
        deletedAt: null,
      },
      {
        $set: { deletedAt: new Date() },
      },
    );
    return !!result;
  }

  async restore(
    userId: string,
    movieId: string,
  ): Promise<IWatchHistory | null> {
    return WatchHistory.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        movieId,
        deletedAt: { $ne: null },
      },
      {
        $set: {
          deletedAt: null,
          watchedAt: new Date(),
        },
      },
      { new: true },
    );
  }

  async softDeleteAll(userId: string): Promise<number> {
    const result = await WatchHistory.updateMany(
      {
        userId: new Types.ObjectId(userId),
        deletedAt: null,
      },
      {
        $set: { deletedAt: new Date() },
      },
    );
    return result.modifiedCount;
  }

  async getRecentlyWatched(
    userId: string,
    limit: number = 10,
  ): Promise<IWatchHistory[]> {
    return WatchHistory.find({
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    })
      .sort({ watchedAt: -1 })
      .limit(limit);
  }

  async getContinueWatching(
    userId: string,
    limit: number = 10,
  ): Promise<IWatchHistory[]> {
    return WatchHistory.find({
      userId: new Types.ObjectId(userId),
      completed: false,
      progress: { $gt: 0 },
      deletedAt: null,
    })
      .sort({ watchedAt: -1 })
      .limit(limit);
  }

  async bulkCreateOrUpdate(
    userId: string,
    items: CreateWatchHistoryDto[],
  ): Promise<{ insertedCount: number; upsertedCount: number }> {
    if (items.length === 0) {
      return { insertedCount: 0, upsertedCount: 0 };
    }

    const userObjectId = new Types.ObjectId(userId);
    const now = new Date();

    const operations = items.map((item) => ({
      updateOne: {
        filter: {
          userId: userObjectId,
          movieId: item.movieId,
        },
        update: {
          $set: {
            movieTitle: item.movieTitle,
            moviePoster: item.moviePoster,
            originName: item.originName,
            episodeCurrent: item.episodeCurrent,
            year: item.year,
            quality: item.quality,
            progress: item.progress,
            duration: item.duration,
            completed: item.completed ?? false,
            currentEpSlug: item.currentEpSlug,
            currentEpName: item.currentEpName,
            source: item.source ?? "ophim",
            watchedAt: now,
            deletedAt: null,
          },
        },
        upsert: true,
      },
    }));

    const result = await WatchHistory.bulkWrite(operations, { ordered: false });

    return {
      insertedCount: result.upsertedCount,
      upsertedCount: result.upsertedCount,
    };
  }
}

export const watchHistoryService = new WatchHistoryService();
