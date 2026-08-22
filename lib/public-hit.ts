import { NextResponse } from "next/server";
import { serveFile } from "@/lib/files";
import { recordPublicHit, resolvePublicHit } from "@/lib/hits";
import {
  needsPassword,
  setUnlockCookie,
  unlockActionPath,
  unlockPage,
  verifyLinkPassword,
} from "@/lib/link-gate";
import { hasCustomOg, isPreviewCrawler, ogPage } from "@/lib/og";
import { getApexOrigin, vanityShortUrl } from "@/lib/hosts";
import { SHORT_URL_KIND, type PublicHitKind } from "@/lib/kinds";
import { shortUrlTarget } from "@/lib/urls";

function canonicalUrl(kind: PublicHitKind, code: string) {
  return kind === SHORT_URL_KIND.SUBDOMAIN
    ? vanityShortUrl(code)
    : `${getApexOrigin()}/${encodeURIComponent(code)}`;
}

export async function handlePublicRequest(
  request: Request,
  code: string,
  kind: PublicHitKind
) {
  const doc = await resolvePublicHit(code, kind);
  if (!doc) {
    return null;
  }

  const label =
    kind === SHORT_URL_KIND.SUBDOMAIN ? `${doc.short}.saar.to` : `saar.to/${doc.short}`;
  const action = unlockActionPath(kind, doc.short);

  if (request.method === "POST") {
    if (!doc.passwordHash) {
      return NextResponse.redirect(canonicalUrl(kind, doc.short), 303);
    }

    const form = await request.formData().catch(() => null);
    const password = String(form?.get("password") ?? "");
    const ok = password
      ? await verifyLinkPassword(doc.passwordHash, password)
      : false;

    if (!ok) {
      return unlockPage(label, action, true);
    }

    const redirectTo = canonicalUrl(kind, doc.short);
    const response = NextResponse.redirect(redirectTo, 303);
    setUnlockCookie(response, doc._id.toString());
    return response;
  }

  const locked = needsPassword(doc, request);
  const preview = isPreviewCrawler(request);

  if (preview && (hasCustomOg(doc) || locked)) {
    return ogPage(doc, canonicalUrl(kind, doc.short));
  }

  if (locked) {
    return unlockPage(label, action);
  }

  await recordPublicHit(request, doc);

  if (shortUrlTarget(doc) === "file") {
    return serveFile(doc);
  }

  return NextResponse.redirect(doc.full, 307);
}
