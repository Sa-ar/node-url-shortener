import mongoose from "mongoose";
import { isExpired } from "@/lib/dates";
import { vanityShortUrl } from "@/lib/hosts";
import { ShortUrl, type ShortUrlAttrs } from "@/lib/models/short-url";
import type { DailyClick, ShortUrlDto } from "@/lib/types";

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;

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

export function shortUrlTarget(
  doc: Pick<ShortUrlAttrs, "target"> | { target?: string | null }
): "url" | "file" {
  return doc.target === "file" ? "file" : "url";
}

export function serializeShortUrl(
  doc: Omit<ShortUrlAttrs, "dailyClicks"> & {
    _id: { toString(): string };
    dailyClicks?: DailyClick[];
  },
  baseUrl: string,
  extras?: { createdByName?: string | null }
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
    target: shortUrlTarget(doc),
    disposition: doc.disposition === "attachment" ? "attachment" : doc.disposition === "inline" ? "inline" : null,
    fileName: doc.fileName ?? null,
    contentType: doc.contentType ?? null,
    fileSize: doc.fileSize ?? null,
    fileSource: doc.fileSource === "blob" || doc.fileSource === "external" ? doc.fileSource : null,
    note: doc.note ?? null,
    createdByName: extras?.createdByName ?? null,
    hasPassword: Boolean(doc.passwordHash),
    ogTitle: doc.ogTitle ?? null,
    ogDescription: doc.ogDescription ?? null,
    ogImageUrl: doc.ogImageUrl ?? null,
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

export function listShortUrls(filter: { userId?: string } = {}) {
  return ShortUrl.find(filter)
    .sort({ createdAt: -1 })
    .select("-dailyClicks")
    .lean();
}

export function findShortUrl(id: string) {
  if (OBJECT_ID_RE.test(id)) {
    return ShortUrl.findOne({ _id: id });
  }

  // Short labels are unique per kind; bare slug lookups mean path links.
  return ShortUrl.findOne({ short: id, kind: { $ne: "subdomain" } });
}

export function findOwnedShortUrl(id: string, userId: string) {
  if (OBJECT_ID_RE.test(id)) {
    return ShortUrl.findOne({ _id: id, userId });
  }

  return ShortUrl.findOne({
    userId,
    short: id,
    kind: { $ne: "subdomain" },
  });
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
}) {
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
