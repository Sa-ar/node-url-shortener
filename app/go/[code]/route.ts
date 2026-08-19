import { notFound } from "next/navigation";
import { handleShortLink } from "@/lib/handle-short-link";
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

  return handleShortLink(request, label, "subdomain");
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const label = code.toLowerCase();

  if (RESERVED_SLUGS.has(label)) {
    notFound();
  }

  return handleShortLink(request, label, "subdomain");
}
