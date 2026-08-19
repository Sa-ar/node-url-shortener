import { NextResponse } from "next/server";
import { getOverviewStats } from "@/lib/clicks";
import { requireSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function shouldExcludeBots(request: Request) {
  return new URL(request.url).searchParams.get("excludeBots") === "true";
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB({ waitForEnsure: true });
  const stats = await getOverviewStats(
    session.user.id,
    session.user.role,
    shouldExcludeBots(request)
  );

  return NextResponse.json(stats);
}
