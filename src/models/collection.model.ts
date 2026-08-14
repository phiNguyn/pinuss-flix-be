import mongoose, { Schema, Document } from "mongoose";

export interface ICollectionItem extends Document {
  _id: mongoose.Types.ObjectId;
  collectionId: mongoose.Types.ObjectId;
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  moviePoster: string;
  movieYear?: number;
  movieType?: "single" | "series";
  source: string;
  sortOrder: number;
  addedAt: Date;
  deletedAt?: Date;
}

const collectionItemSchema = new Schema<ICollectionItem>({
  collectionId: {
    type: Schema.Types.ObjectId,
    ref: "Collection",
    required: true,
    index: true,
  },
  movieId: {
    type: String,
    required: true,
  },
  movieSlug: {
    type: String,
    required: true,
  },
  movieTitle: {
    type: String,
    required: true,
  },
  moviePoster: {
    type: String,
    default: "",
  },
  movieYear: {
    type: Number,
  },
  movieType: {
    type: String,
    enum: ["single", "series"],
  },
  source: {
    type: String,
    default: "ophim",
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: undefined,
  },
});

collectionItemSchema.index({ collectionId: 1, sortOrder: 1 });
collectionItemSchema.index({ collectionId: 1, movieId: 1, source: 1 });
collectionItemSchema.index({ collectionId: 1, deletedAt: 1 });

export const CollectionItem = mongoose.model<ICollectionItem>(
  "CollectionItem",
  collectionItemSchema
);

export interface ICollection extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  coverImage?: string;
  isPublic: boolean;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const collectionSchema = new Schema<ICollection>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    coverImage: {
      type: String,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    itemCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

collectionSchema.index({ userId: 1, createdAt: -1 });
collectionSchema.index({ isPublic: 1 });

export const Collection = mongoose.model<ICollection>("Collection", collectionSchema);
