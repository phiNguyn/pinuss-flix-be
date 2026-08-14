import mongoose, { Schema, Document } from "mongoose";

export enum FavoriteSource {
  OPHIM = "ophim",
  PHIMAPI = "phimapi",
  NGUONC = "nguonc",
}

export interface IFavorite extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  movieId: string;
  movieSlug: string;
  movieTitle: string;
  moviePoster: string;
  movieYear?: number;
  movieType?: "single" | "series";
  source: FavoriteSource;
  createdAt: Date;
  updatedAt: Date;
}

const favoriteSchema = new Schema<IFavorite>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
      enum: Object.values(FavoriteSource),
      default: FavoriteSource.OPHIM,
    },
  },
  {
    timestamps: true,
  }
);

favoriteSchema.index({ userId: 1, movieId: 1, source: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 });

export const Favorite = mongoose.model<IFavorite>("Favorite", favoriteSchema);
