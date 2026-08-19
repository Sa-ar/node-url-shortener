import { model, models, Schema, type Model, type Types } from "mongoose";

export type ClickEventDeviceType =
  | "desktop"
  | "mobile"
  | "tablet"
  | "smarttv"
  | "wearable"
  | "embedded"
  | "console"
  | "xr"
  | "bot"
  | "unknown";

export type ClickEventAttrs = {
  shortUrlId: Types.ObjectId;
  userId: Types.ObjectId;
  short: string;
  ip: string;
  userAgent: string;
  referrer: string;
  acceptLanguage: string;
  country: string;
  region: string;
  city: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: ClickEventDeviceType;
  isBot: boolean;
  visitorKey: string;
  createdAt: Date;
  updatedAt: Date;
};

const clickEventSchema = new Schema<ClickEventAttrs>(
  {
    shortUrlId: {
      type: Schema.Types.ObjectId,
      ref: "ShortUrl",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    short: { type: String, required: true, trim: true },
    ip: { type: String, required: true, default: "" },
    userAgent: { type: String, required: true, default: "" },
    referrer: { type: String, required: true, default: "" },
    acceptLanguage: { type: String, required: true, default: "" },
    country: { type: String, required: true, default: "" },
    region: { type: String, required: true, default: "" },
    city: { type: String, required: true, default: "" },
    browser: { type: String, required: true, default: "" },
    browserVersion: { type: String, required: true, default: "" },
    os: { type: String, required: true, default: "" },
    osVersion: { type: String, required: true, default: "" },
    deviceType: {
      type: String,
      enum: [
        "desktop",
        "mobile",
        "tablet",
        "smarttv",
        "wearable",
        "embedded",
        "console",
        "xr",
        "bot",
        "unknown",
      ],
      required: true,
      default: "unknown",
    },
    isBot: { type: Boolean, required: true, default: false },
    visitorKey: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

clickEventSchema.index({ shortUrlId: 1, createdAt: -1 });
clickEventSchema.index({ userId: 1, createdAt: -1 });
clickEventSchema.index({ shortUrlId: 1, isBot: 1 });
clickEventSchema.index({ userId: 1, isBot: 1 });

export const ClickEvent =
  (models.ClickEvent as Model<ClickEventAttrs> | undefined) ??
  model<ClickEventAttrs>("ClickEvent", clickEventSchema);
