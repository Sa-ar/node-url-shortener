import { model, models, Schema, type Model, type Types } from "mongoose";
import { nanoid } from "nanoid";

export type DailyClick = {
  date: string;
  count: number;
};

export type ShortUrlKind = "path" | "subdomain";
export type ShortUrlTarget = "url" | "file";
export type FileDisposition = "inline" | "attachment";
export type FileSource = "blob" | "external";

export type ShortUrlAttrs = {
  userId: Types.ObjectId;
  full: string;
  short: string;
  kind: ShortUrlKind;
  target: ShortUrlTarget;
  disposition?: FileDisposition | null;
  fileName?: string | null;
  contentType?: string | null;
  fileSize?: number | null;
  fileSource?: FileSource | null;
  note?: string | null;
  passwordHash?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageUrl?: string | null;
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
    target: {
      type: String,
      enum: ["url", "file"],
      required: true,
      default: "url",
    },
    disposition: {
      type: String,
      enum: ["inline", "attachment"],
      default: null,
    },
    fileName: { type: String, default: null },
    contentType: { type: String, default: null },
    fileSize: { type: Number, default: null },
    fileSource: {
      type: String,
      enum: ["blob", "external"],
      default: null,
    },
    note: { type: String, default: null, maxlength: 500 },
    passwordHash: { type: String, default: null },
    ogTitle: { type: String, default: null },
    ogDescription: { type: String, default: null },
    ogImageUrl: { type: String, default: null },
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
