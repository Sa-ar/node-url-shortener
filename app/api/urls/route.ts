import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { ShortUrl } from "@/lib/models/short-url";
import { isOwnerRole } from "@/lib/roles";
import {
  getBaseUrl,
  isDuplicateKeyError,
  isMongooseValidationError,
  serializeShortUrl,
} from "@/lib/urls";
import { createUrlSchema } from "@/lib/validations/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const filter = isOwnerRole(session.user.role)
    ? {}
    : { userId: session.user.id };
  const docs = await ShortUrl.find(filter).sort({ createdAt: -1 });
  const baseUrl = getBaseUrl(request);

  return NextResponse.json(docs.map((doc) => serializeShortUrl(doc, baseUrl)));
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
  });
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await connectDB();

  try {
    const doc = await ShortUrl.create({
      userId: session.user.id,
      full: parsed.data.fullUrl,
      ...(parsed.data.slug ? { short: parsed.data.slug } : {}),
      expiresAt: parsed.data.expiresAt
        ? new Date(parsed.data.expiresAt)
        : null,
    });

    return NextResponse.json(serializeShortUrl(doc, getBaseUrl(request)), {
      status: 201,
    });
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
}
