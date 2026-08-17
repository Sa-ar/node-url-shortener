import { NextResponse } from "next/server";
import type { ShortUrlAttrs } from "@/lib/models/short-url";

const PREVIEW_BOTS =
  /facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|whatsapp|telegrambot|skypeuripreview|googlebot|bingbot|applebot|pinterest|redditbot|embedly|quora link preview|iframely|vkshare|w3c_validator|preview/i;

export function isPreviewCrawler(request: Request) {
  const ua = request.headers.get("user-agent") ?? "";
  return PREVIEW_BOTS.test(ua);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function hasCustomOg(
  doc: Pick<ShortUrlAttrs, "ogTitle" | "ogDescription" | "ogImageUrl">
) {
  return Boolean(doc.ogTitle || doc.ogDescription || doc.ogImageUrl);
}

export function ogPage(
  doc: Pick<
    ShortUrlAttrs,
    | "short"
    | "ogTitle"
    | "ogDescription"
    | "ogImageUrl"
    | "passwordHash"
    | "full"
    | "fileName"
  >,
  canonical: string
) {
  const protectedLink = Boolean(doc.passwordHash);
  const title = protectedLink && !doc.ogTitle
    ? "Protected link · saar.to"
    : doc.ogTitle || doc.fileName || doc.short || "saar.to";
  const description =
    protectedLink && !doc.ogDescription
      ? "This saar.to link is password protected."
      : doc.ogDescription || "A saar.to short link.";
  const image = protectedLink && !doc.ogImageUrl ? "" : doc.ogImageUrl || "";

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <link rel="canonical" href="${escapeHtml(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(canonical)}" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    ${image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : ""}
    <meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    ${image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : ""}
  </head>
  <body>
    <p>${escapeHtml(title)}</p>
  </body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
