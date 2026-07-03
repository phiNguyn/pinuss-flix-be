import { Types } from "mongoose";
import { DailyCheckIn, UserBadge } from "../models/index.js";
import { BADGE_DEFINITIONS, BadgeDefinition } from "../config/badges.config.js";
import { notificationService } from "./notification.service.js";
import { NotificationType } from "../models/notification.model.js";
import { getWatchDate, DEFAULT_TIMEZONE } from "../utils/date.utils.js";

export interface StreakBadgeDto {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: BadgeDefinition["tier"];
  earnedAt: string | null;
  unlocked: boolean;
}

export interface StreakProfile {
  totalActiveDays: number;
  checkedInToday: boolean;
  todayDate: string;
  checkInDates: string[];
  badges: StreakBadgeDto[];
  newlyUnlockedBadges: StreakBadgeDto[];
}

export interface CheckInResult extends StreakProfile {
  isNewCheckIn: boolean;
}

export class StreakService {
  async checkIn(
    userId: string,
    timezone = DEFAULT_TIMEZONE,
  ): Promise<CheckInResult> {
    const today = getWatchDate(new Date(), timezone);
    const userObjectId = new Types.ObjectId(userId);

    const existing = await DailyCheckIn.findOne({
      userId: userObjectId,
      date: today,
    });

    let isNewCheckIn = false;

    if (!existing) {
      await DailyCheckIn.create({ userId: userObjectId, date: today });
      isNewCheckIn = true;
    }

    const profile = await this.getProfile(userId, timezone);
    let newlyUnlockedBadges: StreakBadgeDto[] = [];

    if (isNewCheckIn) {
      newlyUnlockedBadges = await this.evaluateAndAwardBadges(
        userId,
        profile.totalActiveDays,
      );
    }

    return {
      ...profile,
      isNewCheckIn,
      newlyUnlockedBadges,
    };
  }

  async getProfile(
    userId: string,
    timezone = DEFAULT_TIMEZONE,
  ): Promise<StreakProfile> {
    const today = getWatchDate(new Date(), timezone);
    const userObjectId = new Types.ObjectId(userId);

    const [totalActiveDays, checkedInToday, recentCheckIns, earnedBadges] =
      await Promise.all([
        DailyCheckIn.countDocuments({ userId: userObjectId }),
        DailyCheckIn.exists({ userId: userObjectId, date: today }),
        DailyCheckIn.find({ userId: userObjectId })
          .sort({ date: -1 })
          .limit(90)
          .select("date")
          .lean(),
        UserBadge.find({ userId: userObjectId }).sort({ earnedAt: -1 }).lean(),
      ]);

    const earnedMap = new Map(
      earnedBadges.map((b) => [b.badgeId, b.earnedAt.toISOString()]),
    );

    const badges: StreakBadgeDto[] = BADGE_DEFINITIONS.map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      tier: def.tier,
      earnedAt: earnedMap.get(def.id) ?? null,
      unlocked: earnedMap.has(def.id),
    }));

    return {
      totalActiveDays,
      checkedInToday: !!checkedInToday,
      todayDate: today,
      checkInDates: recentCheckIns.map((c) => c.date),
      badges,
      newlyUnlockedBadges: [],
    };
  }

  async getMonthCheckIns(
    userId: string,
    year: number,
    month: number,
  ): Promise<string[]> {
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const checkIns = await DailyCheckIn.find({
      userId: new Types.ObjectId(userId),
      date: { $regex: `^${monthPrefix}` },
    })
      .select("date")
      .sort({ date: 1 })
      .lean();

    return checkIns.map((c) => c.date);
  }

  private async evaluateAndAwardBadges(
    userId: string,
    totalActiveDays: number,
  ): Promise<StreakBadgeDto[]> {
    const eligible = BADGE_DEFINITIONS.filter(
      (b) => totalActiveDays >= b.requiredActiveDays,
    );

    if (eligible.length === 0) {
      return [];
    }

    const userObjectId = new Types.ObjectId(userId);
    const existing = await UserBadge.find({
      userId: userObjectId,
      badgeId: { $in: eligible.map((b) => b.id) },
    }).lean();

    const existingIds = new Set(existing.map((b) => b.badgeId));
    const toAward = eligible.filter((b) => !existingIds.has(b.id));

    if (toAward.length === 0) {
      return [];
    }

    const now = new Date();
    await UserBadge.insertMany(
      toAward.map((badge) => ({
        userId: userObjectId,
        badgeId: badge.id,
        earnedAt: now,
      })),
    );

    const unlocked: StreakBadgeDto[] = toAward.map((def) => ({
      id: def.id,
      name: def.name,
      description: def.description,
      icon: def.icon,
      tier: def.tier,
      earnedAt: now.toISOString(),
      unlocked: true,
    }));

    for (const badge of toAward) {
      notificationService
        .create({
          userId,
          type: NotificationType.EVENT,
          title: `🏅 Huy hiệu mới: ${badge.name}`,
          message: badge.description,
          link: "/",
          metadata: { eventId: badge.id },
        })
        .catch((err) =>
          console.error("Failed to send badge notification:", err),
        );
    }

    return unlocked;
  }
}

export const streakService = new StreakService();
