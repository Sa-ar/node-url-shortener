import { isExpired } from "@/lib/dates";
import { recordClickEvent } from "@/lib/clicks";
import { connectDB } from "@/lib/db";
import { ShortUrl, type ShortUrlAttrs } from "@/lib/models/short-url";
import { recordClick } from "@/lib/urls";
import { isReservedSlug } from "@/lib/validations/url";
import type { HydratedDocument } from "mongoose";

export type PublicLinkDoc = HydratedDocument<ShortUrlAttrs>;

export async function resolvePublicHit(
  code: string,
  kind: "path" | "subdomain"
): Promise<PublicLinkDoc | null> {
  const slug = kind === "subdomain" ? code.toLowerCase() : code;

  if (isReservedSlug(slug)) {
    return null;
  }

  await connectDB();
  const doc =
    kind === "subdomain"
      ? await ShortUrl.findOne({ short: slug, kind: "subdomain" })
      : await ShortUrl.findOne({ short: slug, kind: { $ne: "subdomain" } });

  if (!doc || isExpired(doc.expiresAt)) {
    return null;
  }

  return doc;
}

export async function recordPublicHit(request: Request, doc: PublicLinkDoc) {
  recordClick(doc);

  try {
    await doc.save();
  } catch (error) {
    console.error("[hits] aggregate save failed:", error);
  }

  try {
    await recordClickEvent(request, doc);
  } catch (error) {
    console.error("[hits] click event insert failed:", error);
  }
}
