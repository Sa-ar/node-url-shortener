import { notFound, redirect } from "next/navigation";
import { persistRedirectClick } from "@/lib/clicks";
import { connectDB } from "@/lib/db";
import { isExpired } from "@/lib/dates";
import { ShortUrl } from "@/lib/models/short-url";
import { RESERVED_SLUGS } from "@/lib/validations/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  if (RESERVED_SLUGS.has(code.toLowerCase())) {
    notFound();
  }

  await connectDB();
  // Path links only — subdomain vanity hosts use /go/[code]
  const doc = await ShortUrl.findOne({
    short: code,
    kind: { $ne: "subdomain" },
  });

  if (!doc || isExpired(doc.expiresAt)) {
    notFound();
  }

  await persistRedirectClick(request, doc);
  redirect(doc.full);
}
