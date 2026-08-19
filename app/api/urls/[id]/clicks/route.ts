import { NextResponse } from "next/server";
import { getUrlClicks } from "@/lib/clicks";
import { requireSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { findAccessibleShortUrl } from "@/lib/urls";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function shouldExcludeBots(request: Request) {
  return new URL(request.url).searchParams.get("excludeBots") === "true";
}

export async function GET(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  await connectDB({ waitForEnsure: true });
  const doc = await findAccessibleShortUrl(id, session.user.id, session.user.role);

  if (!doc) {
    return NextResponse.json({ error: "Short URL not found" }, { status: 404 });
  }

  const stats = await getUrlClicks(doc, shouldExcludeBots(request));
  return NextResponse.json(stats);
}
