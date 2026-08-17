import { model, models, Schema, type Model, type Types } from "mongoose";
import { nanoid } from "nanoid";

export type DailyClick = {
  date: string;
  count: number;
};

export type ShortUrlKind = "path" | "subdomain";

export type ShortUrlAttrs = {
  userId: Types.ObjectId;
  full: string;
  short: string;
  kind: ShortUrlKind;
  clicks: number;
  expiresAt?: Date | null;
  lastAccessedAt?: Date | null;
  dailyClicks: DailyClick[];
  createdAt: Date;
  updatedAt: Date;
};

const dailyClickSchema = new Schema<DailyClick>(
  {
    date: { type: String, required: true },
    count: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const shortUrlSchema = new Schema<ShortUrlAttrs>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    full: { type: String, required: true },
    short: {
      type: String,
      required: true,
      default: () => nanoid(7),
    },
    kind: {
      type: String,
      enum: ["path", "subdomain"],
      required: true,
      default: "path",
    },
    clicks: { type: Number, required: true, default: 0 },
    expiresAt: { type: Date, default: null },
    lastAccessedAt: { type: Date, default: null },
    dailyClicks: { type: [dailyClickSchema], default: [] },
  },
  { timestamps: true }
);

// Path slugs and subdomain labels are separate namespaces:
// saar.to/resume and resume.saar.to may both exist.
shortUrlSchema.index({ kind: 1, short: 1 }, { unique: true });
shortUrlSchema.index({ createdAt: -1 });
shortUrlSchema.index({ userId: 1, createdAt: -1 });

export const ShortUrl =
  (models.ShortUrl as Model<ShortUrlAttrs> | undefined) ??
  model<ShortUrlAttrs>("ShortUrl", shortUrlSchema);
