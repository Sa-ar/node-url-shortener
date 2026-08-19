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
import { assignFileTarget, deleteStoredBlob } from "@/lib/files";
import { hashLinkPassword } from "@/lib/link-gate";
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
    kind,
    target:
      read("target") === undefined
        ? doc.target === "file"
          ? "file"
          : "url"
        : read("target") === "file"
          ? "file"
          : "url",
    disposition:
      read("disposition") === "attachment" || doc.disposition === "attachment"
        ? "attachment"
        : "inline",
    fileName: read("fileName") === undefined ? doc.fileName ?? "" : String(read("fileName") ?? ""),
    contentType:
      read("contentType") === undefined
        ? doc.contentType ?? ""
        : String(read("contentType") ?? ""),
    fileSize:
      typeof read("fileSize") === "number" ? read("fileSize") : doc.fileSize ?? undefined,
    fileSource:
      read("fileSource") === "blob" || read("fileSource") === "external"
        ? read("fileSource")
        : doc.fileSource ?? undefined,
    note: read("note") === undefined ? doc.note ?? "" : String(read("note") ?? ""),
    password: String(read("password") ?? ""),
    removePassword: read("removePassword") === true,
    ogTitle: read("ogTitle") === undefined ? doc.ogTitle ?? "" : String(read("ogTitle") ?? ""),
    ogDescription:
      read("ogDescription") === undefined
        ? doc.ogDescription ?? ""
        : String(read("ogDescription") ?? ""),
    ogImageUrl:
      read("ogImageUrl") === undefined ? doc.ogImageUrl ?? "" : String(read("ogImageUrl") ?? ""),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const previousShort = doc.short;
  const previousFull = doc.full;
  const previousSource = doc.fileSource;
  const nextShort = parsed.data.slug;
  const shortChanged = nextShort !== previousShort;

  doc.expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (shortChanged) {
    doc.short = nextShort;
  }
  assignFileTarget(doc, parsed.data);
  doc.note = parsed.data.note?.trim() ? parsed.data.note.trim().slice(0, 500) : null;
  doc.ogTitle = parsed.data.ogTitle ?? null;
  doc.ogDescription = parsed.data.ogDescription ?? null;
  doc.ogImageUrl = parsed.data.ogImageUrl ?? null;
  if (parsed.data.removePassword) {
    doc.passwordHash = null;
  } else if (parsed.data.password) {
    doc.passwordHash = await hashLinkPassword(parsed.data.password);
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
    if (doc.target === "url") {
      await refreshShortUrlUnfurlById(doc._id.toString());
    }
  });

  if (
    previousSource === "blob" &&
    previousFull &&
    (parsed.data.target !== "file" || parsed.data.fullUrl !== previousFull)
  ) {
    await deleteStoredBlob(previousFull);
  }

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
  const blobUrl = doc.fileSource === "blob" ? doc.full : null;
  await doc.deleteOne();

  if (blobUrl) {
    await deleteStoredBlob(blobUrl);
  }

  if (kind === "subdomain") {
    await removeVanityDomain(label);
  }

  revalidateUrlCaches();
  return NextResponse.json({ ok: true });
}
