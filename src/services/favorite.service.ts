import { Favorite, IFavorite, FavoriteSource } from "../models/index.js";
import { Types } from "mongoose";

export interface AddFavoriteDto {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  moviePoster?: string;
  movieYear?: number;
  movieType?: "single" | "series";
  source?: FavoriteSource;
}

export interface FavoriteListResult {
  favorites: IFavorite[];
  total: number;
  page: number;
  limit: number;
}

export class FavoriteService {
  async add(
    userId: string,
    data: AddFavoriteDto
  ): Promise<{ favorite: IFavorite; isNew: boolean }> {
    const source = data.source || FavoriteSource.OPHIM;

    const existing = await Favorite.findOne({
      userId: new Types.ObjectId(userId),
      movieId: data.movieId,
      source,
    });

    if (existing) {
      return { favorite: existing, isNew: false };
    }

    const favorite = new Favorite({
      userId: new Types.ObjectId(userId),
      movieId: data.movieId,
      movieSlug: data.movieSlug,
      movieTitle: data.movieTitle,
      moviePoster: data.moviePoster || "",
      movieYear: data.movieYear,
      movieType: data.movieType,
      source,
    });

    await favorite.save();
    return { favorite, isNew: true };
  }

  async remove(userId: string, movieId: string, source?: FavoriteSource): Promise<boolean> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      movieId,
    };

    if (source) {
      filter.source = source;
    }

    const result = await Favorite.deleteOne(filter);
    return result.deletedCount > 0;
  }

  async getList(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      source?: FavoriteSource;
    } = {}
  ): Promise<FavoriteListResult> {
    const { page = 1, limit = 20, source } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (source) {
      filter.source = source;
    }

    const [favorites, total] = await Promise.all([
      Favorite.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Favorite.countDocuments(filter),
    ]);

    return { favorites, total, page, limit };
  }

  async check(
    userId: string,
    movieId: string,
    source?: FavoriteSource
  ): Promise<{ isFavorited: boolean; favorite?: IFavorite }> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      movieId,
    };

    if (source) {
      filter.source = source;
    }

    const favorite = await Favorite.findOne(filter);
    return { isFavorited: !!favorite, favorite: favorite || undefined };
  }

  async getUserFavoriteCount(userId: string): Promise<number> {
    return Favorite.countDocuments({
      userId: new Types.ObjectId(userId),
    });
  }

  async bulkCheck(
    userId: string,
    movieIds: string[],
    source?: FavoriteSource
  ): Promise<Set<string>> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      movieId: { $in: movieIds },
    };

    if (source) {
      filter.source = source;
    }

    const favorites = await Favorite.find(filter).select("movieId");
    return new Set(favorites.map((f) => f.movieId));
  }
}

export const favoriteService = new FavoriteService();
