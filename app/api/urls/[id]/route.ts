import { after, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { loadUrl, revalidateUrlCaches } from "@/lib/url-data";
import {
  findAccessibleShortUrl,
  getBaseUrl,
  isDuplicateKeyError,
  isMongooseValidationError,
  serializeShortUrl,
  shortUrlKind,
} from "@/lib/urls";
import { editUrlSchema } from "@/lib/validations/url";
import { ensureVanityDomain, removeVanityDomain } from "@/lib/vercel-domains";
import { refreshShortUrlUnfurlById } from "@/lib/unfurl";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const url = await loadUrl(
    id,
    session.user.id,
    session.user.role,
    getBaseUrl(request)
  );

  if (!url) {
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  return NextResponse.json(url);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { id } = await context.params;
  await connectDB({ waitForEnsure: true });
  const doc = await findAccessibleShortUrl(
    id,
    session.user.id,
    session.user.role
  );

  if (!doc) {
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  const kind = shortUrlKind(doc);
  const read = (key: string) =>
    body && typeof body === "object" && key in body
      ? (body as Record<string, unknown>)[key]
      : undefined;

  const parsed = editUrlSchema.safeParse({
    fullUrl: read("fullUrl"),
    slug: read("slug") === undefined ? doc.short : String(read("slug") ?? ""),
    expiresAt: read("expiresAt") === undefined ? "" : String(read("expiresAt") ?? ""),
    // The link's kind is immutable; ignore any client-provided value.
    kind,
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const previousShort = doc.short;
  const nextShort = parsed.data.slug;
  const shortChanged = nextShort !== previousShort;

  doc.full = parsed.data.fullUrl;
  doc.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (shortChanged) {
    doc.short = nextShort;
  }

  try {
    await doc.save();
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        { error: "That slug is already taken" },
        { status: 409 }
      );
    }

    if (isMongooseValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }

  let domainWarning: string | undefined;
  if (kind === "subdomain" && shortChanged) {
    const domainResult = await ensureVanityDomain(nextShort);
    if (!domainResult.ok) {
      domainWarning = domainResult.error;
    } else if (!domainResult.provisioned) {
      domainWarning =
        "Domain not provisioned automatically. Add it in Vercel → Domains, or set VERCEL_TOKEN.";
    }
    await removeVanityDomain(previousShort);
  }

  const dto = serializeShortUrl(doc, getBaseUrl(request));
  after(async () => {
    await refreshShortUrlUnfurlById(doc._id.toString());
  });
  revalidateUrlCaches();
  return NextResponse.json(domainWarning ? { ...dto, domainWarning } : dto);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await connectDB({ waitForEnsure: true });
  const doc = await findAccessibleShortUrl(
    id,
    session.user.id,
    session.user.role
  );

  if (!doc) {
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  const kind = shortUrlKind(doc);
  const label = doc.short;
  await doc.deleteOne();

  if (kind === "subdomain") {
    await removeVanityDomain(label);
  }

  revalidateUrlCaches();
  return NextResponse.json({ ok: true });
}
