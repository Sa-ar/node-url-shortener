import { notFound } from "next/navigation";
import { handleShortLink } from "@/lib/handle-short-link";
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

  return handleShortLink(request, code, "path");
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;

  if (RESERVED_SLUGS.has(code.toLowerCase())) {
    notFound();
  }

  return handleShortLink(request, code, "path");
}
