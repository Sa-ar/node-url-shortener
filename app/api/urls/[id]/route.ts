import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  findAccessibleShortUrl,
  getBaseUrl,
  serializeShortUrl,
} from "@/lib/urls";

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
  await connectDB();
  const doc = await findAccessibleShortUrl(
    id,
    session.user.id,
    session.user.role
  );

  if (!doc) {
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  return NextResponse.json(serializeShortUrl(doc, getBaseUrl(request)));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await connectDB();
  const doc = await findAccessibleShortUrl(
    id,
    session.user.id,
    session.user.role
  );

  if (!doc) {
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  await doc.deleteOne();
  return NextResponse.json({ ok: true });
}
