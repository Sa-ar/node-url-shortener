import { NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { createInvite, listPendingInvites } from "@/lib/invites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ownerId = await requireOwner();
  if (!ownerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const invites = await listPendingInvites(ownerId, request);
  return NextResponse.json(invites);
}

export async function POST(request: Request) {
  const ownerId = await requireOwner();
  if (!ownerId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await connectDB();
  const invite = await createInvite(ownerId, request);
  return NextResponse.json(invite, { status: 201 });
}
