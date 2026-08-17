import { revalidateTag, unstable_cache } from "next/cache";
import { connectDB } from "@/lib/db";
import { ShortUrl, type ShortUrlAttrs } from "@/lib/models/short-url";
import { isOwnerRole } from "@/lib/roles";
import {
  findAccessibleShortUrl,
  serializeShortUrl,
} from "@/lib/urls";
import type { ShortUrlDto } from "@/lib/types";

export const URLS_CACHE_TAG = "urls";

function viewerKey(userId: string, role: string | null | undefined) {
  return isOwnerRole(role) ? "owner" : userId;
}

function toDto(
  doc: ShortUrlAttrs & { _id: { toString(): string } },
  baseUrl: string
): ShortUrlDto {
  return serializeShortUrl(doc, baseUrl);
}

const getCachedUrlList = unstable_cache(
  async (key: string, userId: string, baseUrl: string) => {
    await connectDB();
    const filter = key === "owner" ? {} : { userId };
    const docs = await ShortUrl.find(filter).sort({ createdAt: -1 }).lean();
    return docs.map((doc) => toDto(doc, baseUrl));
  },
  ["url-list"],
  { revalidate: 60, tags: [URLS_CACHE_TAG] }
);

const getCachedUrl = unstable_cache(
  async (id: string, userId: string, role: string, baseUrl: string) => {
    await connectDB();
    const doc = await findAccessibleShortUrl(id, userId, role);
    return doc ? toDto(doc, baseUrl) : null;
  },
  ["url-one"],
  { revalidate: 60, tags: [URLS_CACHE_TAG] }
);

export function loadUrlList(
  userId: string,
  role: string | null | undefined,
  baseUrl: string
) {
  return getCachedUrlList(viewerKey(userId, role), userId, baseUrl);
}

export function loadUrl(
  id: string,
  userId: string,
  role: string | null | undefined,
  baseUrl: string
) {
  return getCachedUrl(id, userId, role ?? "member", baseUrl);
}

export function revalidateUrlCaches() {
  revalidateTag(URLS_CACHE_TAG, { expire: 0 });
}
