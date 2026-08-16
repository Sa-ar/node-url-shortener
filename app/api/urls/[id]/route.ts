import { NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  findOwnedShortUrl,
  getBaseUrl,
  serializeShortUrl,
} from "@/lib/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await connectDB();
  const doc = await findOwnedShortUrl(id, userId);

  if (!doc) {
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  return NextResponse.json(serializeShortUrl(doc, getBaseUrl(request)));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const userId = await requireUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await connectDB();
  const doc = await findOwnedShortUrl(id, userId);

  if (!doc) {
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  await doc.deleteOne();
  return NextResponse.json({ ok: true });
}
