import mongoose from "mongoose";
import { isExpired, utcDateString } from "@/lib/dates";
import { vanityShortUrl } from "@/lib/hosts";
import { ShortUrl, type ShortUrlAttrs } from "@/lib/models/short-url";
import type { DailyClick, ShortUrlDto } from "@/lib/types";

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const DAILY_CLICK_RETENTION_DAYS = 30;

export function getBaseUrl(request?: Request) {
  if (process.env.NEXT_PUBLIC_BASE_URL) {
    return process.env.NEXT_PUBLIC_BASE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  if (request) {
    return new URL(request.url).origin;
  }

  return "https://saar.to";
}

export function shortUrlKind(
  doc: Pick<ShortUrlAttrs, "kind"> | { kind?: string | null }
): "path" | "subdomain" {
  return doc.kind === "subdomain" ? "subdomain" : "path";
}

export function serializeShortUrl(
  doc: ShortUrlAttrs & { _id: { toString(): string } },
  baseUrl: string
): ShortUrlDto {
  const kind = shortUrlKind(doc);
  return {
    id: doc._id.toString(),
    full: doc.full,
    short: doc.short,
    shortUrl:
      kind === "subdomain"
        ? vanityShortUrl(doc.short)
        : `${baseUrl}/${doc.short}`,
    kind,
    clicks: doc.clicks,
    expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
    lastAccessedAt: doc.lastAccessedAt
      ? new Date(doc.lastAccessedAt).toISOString()
      : null,
    dailyClicks: doc.dailyClicks ?? [],
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
    expired: isExpired(doc.expiresAt),
  };
}

export function findShortUrl(id: string) {
  if (OBJECT_ID_RE.test(id)) {
    return ShortUrl.findOne({
      $or: [{ _id: id }, { short: id }],
    });
  }

  return ShortUrl.findOne({ short: id });
}

export function findOwnedShortUrl(id: string, userId: string) {
  if (OBJECT_ID_RE.test(id)) {
    return ShortUrl.findOne({
      userId,
      $or: [{ _id: id }, { short: id }],
    });
  }

  return ShortUrl.findOne({ userId, short: id });
}

export function findAccessibleShortUrl(
  id: string,
  userId: string,
  role: string | null | undefined
) {
  if (role === "owner") {
    return findShortUrl(id);
  }

  return findOwnedShortUrl(id, userId);
}

export function recordClick(doc: {
  clicks: number;
  lastAccessedAt?: Date | null;
  dailyClicks: DailyClick[];
}) {
  const today = utcDateString();
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - DAILY_CLICK_RETENTION_DAYS);
  const cutoffKey = utcDateString(cutoff);

  const bucket = doc.dailyClicks.find((entry) => entry.date === today);
  if (bucket) {
    bucket.count += 1;
  } else {
    doc.dailyClicks.push({ date: today, count: 1 });
  }

  doc.dailyClicks = doc.dailyClicks.filter((entry) => entry.date >= cutoffKey);
  doc.clicks += 1;
  doc.lastAccessedAt = new Date();
}

export function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === 11000
  );
}

export function isMongooseValidationError(
  error: unknown
): error is mongoose.Error.ValidationError {
  return error instanceof mongoose.Error.ValidationError;
}
