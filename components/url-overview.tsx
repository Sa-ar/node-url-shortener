import { summarizeUrls } from "@/lib/dashboard";
import type { ShortUrlDto } from "@/lib/types";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UrlOverview({
  urls,
  isPending = false,
}: {
  urls: ShortUrlDto[];
  isPending?: boolean;
}) {
  if (isPending) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} size="sm">
            <CardHeader className="gap-3">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-8 w-12" />
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  const stats = summarizeUrls(urls);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Links" value={stats.links} />
      <StatCard label="Clicks" value={stats.clicks} />
      <StatCard label="Active" value={stats.active} />
      <StatCard label="Expired" value={stats.expired} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm" className="transition-shadow hover:ring-primary/25">
      <CardHeader>
        <CardDescription className="font-mono text-[11px] uppercase tracking-[0.18em]">
          {label}
        </CardDescription>
        <CardTitle className="font-heading text-3xl tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
