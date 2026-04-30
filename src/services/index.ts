export {
  authService,
  AuthService,
  TokenPair,
  GoogleUserInfo,
} from './auth.service.js';

export {
  registerJwt,
  generateTokens,
  generateAccessToken,
  verifyRefreshToken,
  authenticate,
  JwtPayload,
} from './jwt.service.js';

export {
  watchHistoryService,
  WatchHistoryService,
  CreateWatchHistoryDto,
  UpdateWatchHistoryDto,
} from './watchHistory.service.js';
