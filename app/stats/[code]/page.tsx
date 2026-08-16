import { UrlStats } from "@/components/url-stats";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return <UrlStats code={code} />;
}
