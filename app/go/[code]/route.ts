import { notFound, redirect } from "next/navigation";
import { persistRedirectClick } from "@/lib/clicks";
import { connectDB } from "@/lib/db";
import { isExpired } from "@/lib/dates";
import { ShortUrl } from "@/lib/models/short-url";
import { RESERVED_SLUGS } from "@/lib/validations/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Internal route for vanity subdomain redirects (rewritten from proxy). */
export async function GET(
  request: Request,
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

  await persistRedirectClick(request, doc);
  redirect(doc.full);
}
