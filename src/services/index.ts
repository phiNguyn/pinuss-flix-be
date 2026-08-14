export {
  authService,
  AuthService,
  TokenPair,
  GoogleUserInfo,
} from "./auth.service.js";

export {
  registerJwt,
  generateTokens,
  generateAccessToken,
  verifyRefreshToken,
  authenticate,
  JwtPayload,
} from "./jwt.service.js";

export {
  watchHistoryService,
  WatchHistoryService,
  CreateWatchHistoryDto,
  UpdateWatchHistoryDto,
} from "./watchHistory.service.js";

export {
  movieViewLogService,
  MovieViewLogService,
  CreateViewLogDto,
  TrendingMovieResult,
} from "./movieViewLog.service.js";

export {
  adminService,
  AdminService,
  AdminStats,
  UserListResult,
  UserWatchHistoryResult,
} from "./admin.service.js";

export {
  feedbackService,
  FeedbackService,
  CreateFeedbackDto,
  FeedbackListResult,
} from "./feedback.service.js";

export {
  watchSessionService,
  WatchSessionService,
  CreateWatchSessionDto,
  UserWatchStatsSummary,
} from "./watchSession.service.js";

export {
  leaderboardService,
  LeaderboardService,
  LeaderboardPeriod,
  LeaderboardEntry,
  LeaderboardResult,
} from "./leaderboard.service.js";

export {
  watchCalendarService,
  WatchCalendarService,
  CalendarMonthResult,
  CalendarDayResult,
} from "./watchCalendar.service.js";

export {
  moviesService,
  MoviesService,
  ScheduledEpisode,
} from "./movies.service.js";

export {
  notificationService,
  NotificationService,
  CreateNotificationDto,
  NotificationListResult,
} from "./notification.service.js";

export {
  streakService,
  StreakService,
  StreakProfile,
  CheckInResult,
  StreakBadgeDto,
} from "./streak.service.js";

export {
  favoriteService,
  FavoriteService,
  AddFavoriteDto,
  FavoriteListResult,
} from "./favorite.service.js";

export {
  collectionService,
  CollectionService,
  CreateCollectionDto,
  UpdateCollectionDto,
  AddMovieToCollectionDto,
  CollectionWithItems,
  CollectionListResult,
} from "./collection.service.js";
