import { notFound, redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { ShortUrl } from "@/lib/models/short-url";
import { isExpired } from "@/lib/dates";
import { recordClick } from "@/lib/urls";
import { RESERVED_SLUGS } from "@/lib/validations/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Internal route for vanity subdomain redirects (rewritten from proxy). */
export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const label = code.toLowerCase();

  if (RESERVED_SLUGS.has(label)) {
    notFound();
  }

  await connectDB();
  const doc = await ShortUrl.findOne({ short: label, kind: "subdomain" });

  if (!doc || isExpired(doc.expiresAt)) {
    notFound();
  }

  recordClick(doc);
  await doc.save();
  redirect(doc.full);
}
