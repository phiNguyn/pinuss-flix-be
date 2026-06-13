import { Types } from 'mongoose';
import { UserWatchStats } from '../models/index.js';
import { secondsToHours } from '../utils/date.utils.js';

export type LeaderboardPeriod = 'all' | 'week' | 'month';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string | null;
  name: string | null;
  avatar: string | null;
  bio: string | null;
  totalWatchSeconds: number;
  totalWatchHours: number;
}

export interface LeaderboardResult {
  period: LeaderboardPeriod;
  myRank: number | null;
  myTotalWatchSeconds: number;
  myTotalWatchHours: number;
  podium: LeaderboardEntry[];
  list: LeaderboardEntry[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function getSortField(period: LeaderboardPeriod): string {
  switch (period) {
    case 'week':
      return 'weeklyWatchSeconds';
    case 'month':
      return 'monthlyWatchSeconds';
    default:
      return 'totalWatchSeconds';
  }
}

function mapEntry(doc: Record<string, unknown>, rank: number): LeaderboardEntry {
  const watchSeconds = (doc.watchSeconds as number) ?? 0;

  return {
    rank,
    userId: String(doc.userId),
    username: (doc.username as string | null) ?? null,
    name: (doc.name as string | null) ?? null,
    avatar: (doc.avatar as string | null) ?? null,
    bio: (doc.bio as string | null) ?? null,
    totalWatchSeconds: watchSeconds,
    totalWatchHours: secondsToHours(watchSeconds),
  };
}

export class LeaderboardService {
  async getLeaderboard(
    options: {
      period?: LeaderboardPeriod;
      page?: number;
      limit?: number;
      currentUserId?: string;
    } = {},
  ): Promise<LeaderboardResult> {
    const { period = 'all', page = 1, limit = 50, currentUserId } = options;
    const skip = (page - 1) * limit;
    const sortField = getSortField(period);

    const matchStage =
      period === 'all'
        ? { [sortField]: { $gt: 0 } }
        : { [sortField]: { $gt: 0 } };

    const [total, rankedUsers, myStats] = await Promise.all([
      UserWatchStats.countDocuments(matchStage),
      UserWatchStats.aggregate([
        { $match: matchStage },
        { $sort: { [sortField]: -1, lastWatchedAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user',
            pipeline: [
              {
                $project: {
                  name: 1,
                  username: 1,
                  avatar: 1,
                  bio: 1,
                },
              },
            ],
          },
        },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            userId: 1,
            watchSeconds: `$${sortField}`,
            username: '$user.username',
            name: '$user.name',
            avatar: '$user.avatar',
            bio: '$user.bio',
          },
        },
      ]),
      currentUserId
        ? UserWatchStats.findOne({ userId: new Types.ObjectId(currentUserId) })
        : null,
    ]);

    const entries = rankedUsers.map((doc, index) =>
      mapEntry(doc, skip + index + 1),
    );

    let myRank: number | null = null;
    let myTotalWatchSeconds = 0;

    if (myStats && currentUserId) {
      myTotalWatchSeconds = myStats[sortField as keyof typeof myStats] as number;

      if (myTotalWatchSeconds > 0) {
        myRank =
          (await UserWatchStats.countDocuments({
            [sortField]: { $gt: myTotalWatchSeconds },
          })) + 1;
      }
    }

    const topThree = entries.slice(0, 3);
    const podium =
      topThree.length >= 3
        ? [topThree[1], topThree[0], topThree[2]]
        : topThree.length === 2
          ? [topThree[1], topThree[0]]
          : topThree;

    const list = entries.slice(3);

    return {
      period,
      myRank,
      myTotalWatchSeconds,
      myTotalWatchHours: secondsToHours(myTotalWatchSeconds),
      podium,
      list,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getMyRank(
    userId: string,
    period: LeaderboardPeriod = 'all',
  ): Promise<{
    rank: number | null;
    totalWatchSeconds: number;
    totalWatchHours: number;
    period: LeaderboardPeriod;
  }> {
    const sortField = getSortField(period);
    const stats = await UserWatchStats.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!stats) {
      return {
        rank: null,
        totalWatchSeconds: 0,
        totalWatchHours: 0,
        period,
      };
    }

    const totalWatchSeconds = stats[sortField as keyof typeof stats] as number;

    if (totalWatchSeconds <= 0) {
      return {
        rank: null,
        totalWatchSeconds: 0,
        totalWatchHours: 0,
        period,
      };
    }

    const rank =
      (await UserWatchStats.countDocuments({
        [sortField]: { $gt: totalWatchSeconds },
      })) + 1;

    return {
      rank,
      totalWatchSeconds,
      totalWatchHours: secondsToHours(totalWatchSeconds),
      period,
    };
  }
}

export const leaderboardService = new LeaderboardService();
