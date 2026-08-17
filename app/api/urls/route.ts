import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ShortUrl } from "@/lib/models/short-url";
import { isOwnerRole } from "@/lib/roles";
import { loadUrlList, revalidateUrlCaches } from "@/lib/url-data";
import {
  getBaseUrl,
  isDuplicateKeyError,
  isMongooseValidationError,
  serializeShortUrl,
} from "@/lib/urls";
import { createUrlSchema } from "@/lib/validations/url";
import { ensureVanityDomain } from "@/lib/vercel-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const urls = await loadUrlList(
    session.user.id,
    session.user.role,
    getBaseUrl(request)
  );

  return NextResponse.json(urls);
}

export async function POST(request: Request) {
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

  const kindRaw =
    body && typeof body === "object" && "kind" in body
      ? String((body as { kind: unknown }).kind ?? "path")
      : "path";

  const parsed = createUrlSchema.safeParse({
    fullUrl:
      body && typeof body === "object" && "fullUrl" in body
        ? (body as { fullUrl: unknown }).fullUrl
        : undefined,
    slug:
      body && typeof body === "object" && "slug" in body
        ? String((body as { slug: unknown }).slug ?? "")
        : "",
    expiresAt:
      body && typeof body === "object" && "expiresAt" in body
        ? String((body as { expiresAt: unknown }).expiresAt ?? "")
        : "",
    kind: kindRaw === "subdomain" ? "subdomain" : "path",
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (parsed.data.kind === "subdomain" && !isOwnerRole(session.user.role)) {
    return NextResponse.json(
      { error: "Only owners can create premium subdomain links" },
      { status: 403 }
    );
  }

  if (parsed.data.kind === "subdomain" && !parsed.data.slug) {
    return NextResponse.json(
      { error: "Subdomain is required" },
      { status: 400 }
    );
  }

  await connectDB({ waitForEnsure: true });

  try {
    const doc = await ShortUrl.create({
      userId: session.user.id,
      full: parsed.data.fullUrl,
      kind: parsed.data.kind,
      ...(parsed.data.slug ? { short: parsed.data.slug } : {}),
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null,
    });

    let domainWarning: string | undefined;
    if (parsed.data.kind === "subdomain" && parsed.data.slug) {
      const domainResult = await ensureVanityDomain(parsed.data.slug);
      if (!domainResult.ok) {
        domainWarning = domainResult.error;
      } else if (!domainResult.provisioned) {
        domainWarning =
          "Domain not provisioned automatically. Add it in Vercel → Domains, or set VERCEL_TOKEN.";
      }
    }

    const dto = serializeShortUrl(doc, getBaseUrl(request));
    revalidateUrlCaches();
    return NextResponse.json(
      domainWarning ? { ...dto, domainWarning } : dto,
      { status: 201 }
    );
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return NextResponse.json(
        {
          error:
            parsed.data.kind === "subdomain"
              ? "That subdomain is already taken"
              : "That slug is already taken",
        },
        { status: 409 }
      );
    }

    if (isMongooseValidationError(error)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    throw error;
  }
}
