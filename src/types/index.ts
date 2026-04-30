export interface JwtPayload {
  userId: string;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  provider: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WatchHistoryResponse {
  id: string;
  movieId: string;
  movieTitle: string;
  moviePoster?: string;
  progress: number;
  duration: number;
  completed: boolean;
  watchedAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}
