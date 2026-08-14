import { User, IUser, UserRole } from "../models/index.js";
import { WatchHistory } from "../models/index.js";
import { Comment } from "../models/index.js";
import { DailyCheckIn } from "../models/index.js";
import { Types } from "mongoose";

export interface AdminStats {
  totalUsers: number;
  totalUsersGrowth: number;
  activeUsers: number;
  totalComments: number;
  totalWatchHistory: number;
}

export interface UserListResult {
  users: IUser[];
  total: number;
  page: number;
  limit: number;
}

export interface UserWatchHistoryResult {
  history: any[];
  total: number;
  page: number;
  limit: number;
}

export class AdminService {
  /**
   * Verify if user has admin role
   * CRITICAL: This must be called before any admin operation
   */
  async verifyAdmin(
    userId: string,
  ): Promise<{ isAdmin: boolean; user?: IUser }> {
    if (!userId || !Types.ObjectId.isValid(userId)) {
      return { isAdmin: false };
    }

    const user = await User.findById(userId).select("+password");

    if (!user) {
      return { isAdmin: false };
    }

    return {
      isAdmin: user.role === UserRole.ADMIN,
      user,
    };
  }

  /**
   * Get dashboard statistics
   */
  async getStats(): Promise<AdminStats> {
    const now = new Date();
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, totalComments, totalWatchHistory] =
      await Promise.all([
        User.countDocuments(),
        User.countDocuments({ isActive: true }),
        Comment.countDocuments(),
        WatchHistory.countDocuments(),
      ]);

    const lastMonthUsers = await User.countDocuments({
      createdAt: { $lt: lastMonth },
    });

    const growth =
      lastMonthUsers > 0
        ? Math.round(((totalUsers - lastMonthUsers) / lastMonthUsers) * 100)
        : 100;

    return {
      totalUsers,
      totalUsersGrowth: growth,
      activeUsers,
      totalComments,
      totalWatchHistory,
    };
  }

  /**
   * Get paginated user list
   * CRITICAL: Only for admin users
   */
  async getUsers(
    options: {
      page?: number;
      limit?: number;
      s?: string;
      role?: UserRole;
      isActive?: boolean;
      createdWithin?: number; // days
      lastLoginWithin?: number; // days
      hasCheckedInToday?: boolean;
    } = {},
  ): Promise<UserListResult> {
    const { page = 1, limit = 20, s, role, isActive, createdWithin, lastLoginWithin, hasCheckedInToday } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (role) {
      filter.role = role;
    }

    if (typeof isActive === "boolean") {
      filter.isActive = isActive;
    }

    if (s) {
      filter.$or = [
        { email: { $regex: s, $options: "i" } },
        { name: { $regex: s, $options: "i" } },
        { username: { $regex: s, $options: "i" } },
      ];
    }

    // Filter by creation date
    if (createdWithin) {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - createdWithin);
      filter.createdAt = { $gte: dateThreshold };
    }

    // Filter by last login
    if (lastLoginWithin) {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - lastLoginWithin);
      filter.lastLogin = { $gte: dateThreshold };
    }

    // Filter by today's check-in
    if (typeof hasCheckedInToday === "boolean") {
      const today = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
      if (hasCheckedInToday) {
        // Users who checked in today
        const checkIns = await DailyCheckIn.find({ date: today }).select("userId").lean();
        const userIds = checkIns.map(c => c.userId);
        filter._id = { $in: userIds };
      } else {
        // Users who haven't checked in today
        const checkIns = await DailyCheckIn.find({ date: today }).select("userId").lean();
        const userIds = checkIns.map(c => c.userId);
        filter._id = { $nin: userIds };
      }
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password") // NEVER expose passwords
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    return { users, total, page, limit };
  }

  /**
   * Get user's detailed info including deleted watch history
   * CRITICAL: Only for admin users
   */
  async getUserDetail(userId: string): Promise<IUser | null> {
    if (!Types.ObjectId.isValid(userId)) {
      return null;
    }

    // Verify user exists
    const user = await User.findById(userId).select("-password");
    return user;
  }

  /**
   * Get user's watch history including deleted items
   * CRITICAL: Only for admin users
   */
  async getUserWatchHistory(
    userId: string,
    options: { page?: number; limit?: number; includeDeleted?: boolean } = {},
  ): Promise<UserWatchHistoryResult> {
    const { page = 1, limit = 20, includeDeleted = true } = options;

    if (!Types.ObjectId.isValid(userId)) {
      return { history: [], total: 0, page, limit };
    }

    const skip = (page - 1) * limit;

    // Filter includes deleted items (deletedAt is not null)
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (!includeDeleted) {
      filter.deletedAt = null;
    }

    const [history, total] = await Promise.all([
      WatchHistory.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      WatchHistory.countDocuments(filter),
    ]);

    return { history, total, page, limit };
  }

  /**
   * Get all comments (optionally filtered by user)
   * CRITICAL: Only for admin users
   */
  async getComments(
    options: {
      page?: number;
      limit?: number;
      userId?: string;
      movieSlug?: string;
    } = {},
  ): Promise<{ comments: any[]; total: number; page: number; limit: number }> {
    const { page = 1, limit = 20, userId, movieSlug } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};

    if (userId && Types.ObjectId.isValid(userId)) {
      filter.userId = new Types.ObjectId(userId);
    }

    if (movieSlug) {
      filter.movieSlug = movieSlug;
    }

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .populate("userId", "name email avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments(filter),
    ]);

    return { comments, total, page, limit };
  }

  /**
   * Delete a comment (admin action)
   */
  async deleteComment(commentId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(commentId)) {
      return false;
    }

    const result = await Comment.findByIdAndDelete(commentId);
    return !!result;
  }

  /**
   * Update user role (admin action)
   */
  async updateUserRole(
    targetUserId: string,
    newRole: UserRole,
    adminUserId: string,
  ): Promise<{ success: boolean; message: string }> {
    // Prevent self-modification
    if (targetUserId === adminUserId) {
      return {
        success: false,
        message: "Không thể tự thay đổi vai trò của mình",
      };
    }

    if (!Types.ObjectId.isValid(targetUserId)) {
      return { success: false, message: "Invalid user ID" };
    }

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { role: newRole },
      { new: true },
    );

    if (!user) {
      return { success: false, message: "User không tồn tại" };
    }

    return { success: true, message: `Đã cập nhật vai trò thành ${newRole}` };
  }

  /**
   * Deactivate/Activate user account
   */
  async toggleUserStatus(
    targetUserId: string,
    isActive: boolean,
  ): Promise<{ success: boolean; message: string }> {
    if (!Types.ObjectId.isValid(targetUserId)) {
      return { success: false, message: "Invalid user ID" };
    }

    const user = await User.findByIdAndUpdate(
      targetUserId,
      { isActive },
      { new: true },
    );

    if (!user) {
      return { success: false, message: "User không tồn tại" };
    }

    return {
      success: true,
      message: isActive ? "Đã kích hoạt tài khoản" : "Đã vô hiệu hóa tài khoản",
    };
  }

  /**
   * Get today's check-ins ranked by time (earliest first)
   */
  async getTodayCheckIns(
    options: { page?: number; limit?: number } = {},
  ): Promise<{
    checkIns: Array<{
      _id: string;
      userId: {
        _id: string;
        email: string;
        name?: string;
        avatar?: string;
      };
      date: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;

    // Get today's date in UTC+7
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const [checkIns, total] = await Promise.all([
      DailyCheckIn.find({ date: today })
        .sort({ createdAt: 1 }) // Earliest first
        .skip(skip)
        .limit(limit)
        .populate("userId", "name email avatar")
        .lean(),
      DailyCheckIn.countDocuments({ date: today }),
    ]);

    // Transform to include user info properly
    const transformedCheckIns = checkIns.map((checkIn, index) => ({
      _id: checkIn._id.toString(),
      userId: {
        _id: (checkIn.userId as any)._id.toString(),
        email: (checkIn.userId as any).email,
        name: (checkIn.userId as any).name,
        avatar: (checkIn.userId as any).avatar,
      },
      date: checkIn.date,
      createdAt: checkIn.createdAt.toISOString(),
    }));

    return {
      checkIns: transformedCheckIns,
      total,
      page,
      limit,
    };
  }
}

export const adminService = new AdminService();
