import { notFound } from "next/navigation";
import { handlePublicRequest } from "@/lib/public-hit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(
  request: Request,
  context: { params: Promise<{ code: string }> }
) {
  const { code } = await context.params;
  const response = await handlePublicRequest(request, code, "subdomain");
  if (!response) {
    notFound();
  }
  return response;
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
