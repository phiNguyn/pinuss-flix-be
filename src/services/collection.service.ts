import {
  Collection,
  ICollection,
  CollectionItem,
  ICollectionItem,
} from "../models/index.js";
import { Types } from "mongoose";

export interface CreateCollectionDto {
  name: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
}

export interface UpdateCollectionDto {
  name?: string;
  description?: string;
  coverImage?: string;
  isPublic?: boolean;
}

export interface AddMovieToCollectionDto {
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  moviePoster?: string;
  movieYear?: number;
  movieType?: "single" | "series";
  source?: string;
}

export interface CollectionWithItems extends ICollection {
  items: ICollectionItem[];
}

export interface CollectionListResult {
  collections: ICollection[];
  total: number;
  page: number;
  limit: number;
}

export class CollectionService {
  async create(
    userId: string,
    data: CreateCollectionDto,
  ): Promise<ICollection> {
    const collection = new Collection({
      userId: new Types.ObjectId(userId),
      name: data.name,
      description: data.description,
      coverImage: data.coverImage,
      isPublic: data.isPublic ?? false,
    });

    await collection.save();
    return collection;
  }

  async update(
    collectionId: string,
    userId: string,
    data: UpdateCollectionDto,
  ): Promise<ICollection | null> {
    const collection = await Collection.findOneAndUpdate(
      {
        _id: new Types.ObjectId(collectionId),
        userId: new Types.ObjectId(userId),
      },
      { $set: data },
      { new: true },
    );

    return collection;
  }

  async delete(collectionId: string, userId: string): Promise<boolean> {
    const result = await Collection.deleteOne({
      _id: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(userId),
    });

    if (result.deletedCount > 0) {
      await CollectionItem.deleteMany({
        collectionId: new Types.ObjectId(collectionId),
      });
      return true;
    }

    return false;
  }

  async getList(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      includePublic?: boolean;
    } = {},
  ): Promise<CollectionListResult> {
    const { page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    const [collections, total] = await Promise.all([
      Collection.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Collection.countDocuments(filter),
    ]);

    return { collections, total, page, limit };
  }

  async getById(
    collectionId: string,
    userId?: string,
  ): Promise<CollectionWithItems | null> {
    if (!Types.ObjectId.isValid(collectionId)) {
      return null;
    }

    const collection = await Collection.findById(collectionId);

    if (!collection) {
      return null;
    }

    if (!collection.isPublic && collection.userId.toString() !== userId) {
      return null;
    }

    const items = await CollectionItem.find({
      collectionId: collection._id,
      deletedAt: { $eq: null, $exists: false },
    }).sort({ sortOrder: 1, addedAt: -1 });

    return {
      ...collection.toObject(),
      items,
    } as unknown as CollectionWithItems;
  }

  async addMovie(
    collectionId: string,
    userId: string,
    data: AddMovieToCollectionDto,
  ): Promise<{ item: ICollectionItem; isNew: boolean; restored: boolean }> {
    const collection = await Collection.findOne({
      _id: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(userId),
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Check if item exists and is not deleted
    const existingItem = await CollectionItem.findOne({
      collectionId: new Types.ObjectId(collectionId),
      movieId: data.movieId,
      source: data.source || "ophim",
      $or: [{ deletedAt: { $eq: null } }, { deletedAt: { $exists: false } }],
    });

    if (existingItem) {
      return { item: existingItem, isNew: false, restored: false };
    }

    // Check if item exists but was soft-deleted - restore it
    const softDeletedItem = await CollectionItem.findOne({
      collectionId: new Types.ObjectId(collectionId),
      movieId: data.movieId,
      source: data.source || "ophim",
      deletedAt: { $ne: null },
    });

    if (softDeletedItem) {
      softDeletedItem.deletedAt = undefined;
      await softDeletedItem.save();

      await Collection.findByIdAndUpdate(collectionId, {
        $inc: { itemCount: 1 },
        updatedAt: new Date(),
      });

      return { item: softDeletedItem, isNew: false, restored: true };
    }

    // Create new item
    const maxSortItem = await CollectionItem.findOne({
      collectionId: new Types.ObjectId(collectionId),
      $or: [{ deletedAt: { $eq: null } }, { deletedAt: { $exists: false } }],
    }).sort({ sortOrder: -1 });

    const sortOrder = (maxSortItem?.sortOrder || 0) + 1;

    const item = new CollectionItem({
      collectionId: new Types.ObjectId(collectionId),
      movieId: data.movieId,
      movieSlug: data.movieSlug,
      movieTitle: data.movieTitle,
      moviePoster: data.moviePoster || "",
      movieYear: data.movieYear,
      movieType: data.movieType,
      source: data.source || "ophim",
      sortOrder,
    });

    await item.save();

    await Collection.findByIdAndUpdate(collectionId, {
      $inc: { itemCount: 1 },
      updatedAt: new Date(),
    });

    return { item, isNew: true, restored: false };
  }

  async removeMovie(
    collectionId: string,
    userId: string,
    movieId: string,
    source?: string,
  ): Promise<boolean> {
    const collection = await Collection.findOne({
      _id: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(userId),
    });

    if (!collection) {
      return false;
    }

    const filter: Record<string, unknown> = {
      collectionId: new Types.ObjectId(collectionId),
      movieId,
      deletedAt: { $eq: null, $exists: false },
    };

    if (source) {
      filter.source = source;
    }

    const result = await CollectionItem.updateOne(filter, {
      $set: { deletedAt: new Date() },
    });

    if (result.modifiedCount > 0) {
      await Collection.findByIdAndUpdate(collectionId, {
        $inc: { itemCount: -1 },
        updatedAt: new Date(),
      });
      return true;
    }

    return false;
  }

  async restoreMovie(
    collectionId: string,
    userId: string,
    movieId: string,
    source?: string,
  ): Promise<boolean> {
    const collection = await Collection.findOne({
      _id: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(userId),
    });

    if (!collection) {
      return false;
    }

    const filter: Record<string, unknown> = {
      collectionId: new Types.ObjectId(collectionId),
      movieId,
      deletedAt: { $ne: null },
    };

    if (source) {
      filter.source = source;
    }

    const result = await CollectionItem.updateOne(filter, {
      $unset: { deletedAt: "" },
    });

    if (result.modifiedCount > 0) {
      await Collection.findByIdAndUpdate(collectionId, {
        $inc: { itemCount: 1 },
        updatedAt: new Date(),
      });
      return true;
    }

    return false;
  }

  async getRemovedMovies(
    collectionId: string,
    userId: string,
  ): Promise<ICollectionItem[]> {
    const collection = await Collection.findOne({
      _id: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(userId),
    });

    if (!collection) {
      return [];
    }

    return CollectionItem.find({
      collectionId: collection._id,
      deletedAt: { $ne: null },
    }).sort({ deletedAt: -1 });
  }

  async reorderMovies(
    collectionId: string,
    userId: string,
    orderedMovieIds: string[],
  ): Promise<boolean> {
    const collection = await Collection.findOne({
      _id: new Types.ObjectId(collectionId),
      userId: new Types.ObjectId(userId),
    });

    if (!collection) {
      return false;
    }

    const bulkOps = orderedMovieIds.map((movieId, index) => ({
      updateOne: {
        filter: {
          collectionId: new Types.ObjectId(collectionId),
          movieId,
        },
        update: { $set: { sortOrder: index } },
      },
    }));

    await CollectionItem.bulkWrite(bulkOps);
    return true;
  }

  async checkMovieInCollections(
    userId: string,
    movieId: string,
    source?: string,
  ): Promise<ICollection[]> {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    const collections = await Collection.find(filter);
    const collectionIds = collections.map((c) => c._id);

    const itemFilter: Record<string, unknown> = {
      collectionId: { $in: collectionIds },
      movieId,
    };

    if (source) {
      itemFilter.source = source;
    }

    const items = await CollectionItem.find(itemFilter);
    const containingCollectionIds = items.map((item) => item.collectionId);

    return collections.filter((c) =>
      containingCollectionIds.some((id) => id.toString() === c._id.toString()),
    );
  }
}

export const collectionService = new CollectionService();
