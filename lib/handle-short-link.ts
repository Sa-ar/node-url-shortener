import { getClientPlatform, getUserAgent, isSocialCrawler } from "@/lib/crawlers";
import { getDeepLinkMatch } from "@/lib/deep-links";
import { connectDB } from "@/lib/db";
import { isExpired } from "@/lib/dates";
import { type ShortUrlDoc, ShortUrl } from "@/lib/models/short-url";
import { getBaseUrl, recordClick } from "@/lib/urls";
import { isUnfurlStale, refreshShortUrlUnfurl } from "@/lib/unfurl";

type ShortLinkKind = "path" | "subdomain";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function appendMetaTag(lines: string[], key: string, value: string | null | undefined) {
  if (!value) {
    return;
  }

  const attr = key.startsWith("og:") || key.startsWith("al:") ? "property" : "name";
  lines.push(`    <meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(value)}" />`);
}

function uniqueMetaTags(tags: Array<{ key: string; value: string }>) {
  const deduped = new Map<string, string>();
  for (const tag of tags) {
    const key = tag.key.trim().toLowerCase();
    const value = tag.value.trim();
    if (key && value && !deduped.has(key)) {
      deduped.set(key, value);
    }
  }

  return Array.from(deduped.entries()).map(([key, value]) => ({ key, value }));
}

function buildShortUrl(doc: ShortUrlDoc, request: Request) {
  if (doc.kind === "subdomain") {
    return new URL(request.url).origin;
  }

  return `${getBaseUrl(request)}/${encodeURIComponent(doc.short)}`;
}

function redirectTo(location: string, status = 302) {
  return new Response(null, {
    status,
    headers: { location },
  });
}

async function recordPublicClick(doc: ShortUrlDoc) {
  recordClick(doc);
  await doc.save();
}

function renderHtml({
  title,
  description,
  image,
  imageAlt,
  imageWidth,
  imageHeight,
  type,
  siteName,
  twitterCard,
  video,
  videoSecureUrl,
  videoType,
  shortUrl,
  canonicalUrl,
  appLinks,
  script,
}: {
  title: string;
  description: string;
  image?: string | null;
  imageAlt?: string | null;
  imageWidth?: string | null;
  imageHeight?: string | null;
  type?: string | null;
  siteName?: string | null;
  twitterCard?: string | null;
  video?: string | null;
  videoSecureUrl?: string | null;
  videoType?: string | null;
  shortUrl: string;
  canonicalUrl: string;
  appLinks: Array<{ key: string; value: string }>;
  script?: string;
}) {
  const lines = [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    `    <title>${escapeHtml(title)}</title>`,
    `    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
  ];

  appendMetaTag(lines, "description", description);
  appendMetaTag(lines, "og:title", title);
  appendMetaTag(lines, "og:description", description);
  appendMetaTag(lines, "og:type", type ?? "website");
  appendMetaTag(lines, "og:url", shortUrl);
  appendMetaTag(lines, "og:site_name", siteName ?? "saar.to");
  appendMetaTag(lines, "twitter:card", twitterCard ?? (image ? "summary_large_image" : "summary"));
  appendMetaTag(lines, "twitter:title", title);
  appendMetaTag(lines, "twitter:description", description);
  appendMetaTag(lines, "twitter:url", shortUrl);
  appendMetaTag(lines, "twitter:image", image);
  appendMetaTag(lines, "twitter:image:alt", imageAlt);
  appendMetaTag(lines, "og:image", image);
  appendMetaTag(lines, "og:image:alt", imageAlt);
  appendMetaTag(lines, "og:image:width", imageWidth);
  appendMetaTag(lines, "og:image:height", imageHeight);
  appendMetaTag(lines, "og:video", video);
  appendMetaTag(lines, "og:video:secure_url", videoSecureUrl);
  appendMetaTag(lines, "og:video:type", videoType);

  for (const tag of uniqueMetaTags(appLinks)) {
    appendMetaTag(lines, tag.key, tag.value);
  }

  lines.push("  </head>", "  <body>");
  lines.push(`    <p>Open <a href="${escapeHtml(canonicalUrl)}">${escapeHtml(title)}</a></p>`);

  if (script) {
    lines.push(`    <script>${script}</script>`);
  }

  lines.push("  </body>", "</html>");
  return lines.join("\n");
}

async function maybeRefreshUnfurl(doc: ShortUrlDoc) {
  if (!isUnfurlStale(doc.unfurl)) {
    return doc.unfurl;
  }

  try {
    return await refreshShortUrlUnfurl(doc, { timeoutMs: 2_500 });
  } catch {
    return null;
  }
}

function buildIosTrampolineScript(appUrl: string, fallbackUrl: string) {
  const app = JSON.stringify(appUrl);
  const fallback = JSON.stringify(fallbackUrl);

  return `
let leftPage = false;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    leftPage = true;
  }
});
window.location.replace(${app});
setTimeout(() => {
  if (!leftPage) {
    window.location.replace(${fallback});
  }
}, 800);
`.trim();
}

async function findShortUrl(code: string, kind: ShortLinkKind) {
  await connectDB();
  return ShortUrl.findOne(
    kind === "subdomain"
      ? { short: code.toLowerCase(), kind: "subdomain" }
      : { short: code, kind: { $ne: "subdomain" } }
  );
}

function buildPreviewFields(doc: ShortUrlDoc, request: Request) {
  const shortUrl = buildShortUrl(doc, request);
  const fallbackTitle = doc.short;
  const fallbackDescription = doc.full;
  const canonicalUrl = doc.unfurl?.finalUrl || doc.full;

  return {
    shortUrl,
    canonicalUrl,
    title: doc.unfurl?.title || fallbackTitle,
    description: doc.unfurl?.description || fallbackDescription,
    image: doc.unfurl?.image,
    imageAlt: doc.unfurl?.imageAlt,
    imageWidth: doc.unfurl?.imageWidth,
    imageHeight: doc.unfurl?.imageHeight,
    type: doc.unfurl?.type,
    siteName: doc.unfurl?.siteName,
    twitterCard: doc.unfurl?.twitterCard,
    video: doc.unfurl?.video,
    videoSecureUrl: doc.unfurl?.videoSecureUrl,
    videoType: doc.unfurl?.videoType,
    appLinks: doc.unfurl?.appLinks ?? [],
  };
}

export async function handleShortLink(
  request: Request,
  code: string,
  kind: ShortLinkKind
) {
  const doc = await findShortUrl(code, kind);

  if (!doc || isExpired(doc.expiresAt)) {
    return new Response("Not Found", { status: 404 });
  }

  if (request.method === "HEAD") {
    return new Response(null, { status: 200 });
  }

  const userAgent = getUserAgent(request);
  const deepLinkMatch = getDeepLinkMatch(doc.full);

  if (isSocialCrawler(userAgent)) {
    const unfurl = await maybeRefreshUnfurl(doc);
    if (!unfurl) {
      return redirectTo(doc.full);
    }

    const preview = buildPreviewFields(doc, request);
    const html = renderHtml({
      ...preview,
      appLinks: [...preview.appLinks, ...(deepLinkMatch?.appLinks ?? [])],
    });

    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  const platform = getClientPlatform(userAgent);
  if (deepLinkMatch && platform === "android" && deepLinkMatch.androidIntentUrl) {
    await recordPublicClick(doc);
    return redirectTo(deepLinkMatch.androidIntentUrl);
  }

  if (deepLinkMatch && platform === "ios" && deepLinkMatch.iosUrl) {
    await recordPublicClick(doc);
    const preview = buildPreviewFields(doc, request);
    const html = renderHtml({
      ...preview,
      appLinks: [...preview.appLinks, ...deepLinkMatch.appLinks],
      script: buildIosTrampolineScript(deepLinkMatch.iosUrl, doc.full),
    });

    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  await recordPublicClick(doc);
  return redirectTo(doc.full);
}
