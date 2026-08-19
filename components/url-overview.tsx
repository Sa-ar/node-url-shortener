import type { OverviewStatsDto } from "@/lib/types";
import { ErrorState } from "@/components/query-state";
import {
  Card,
  CardDescription,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UrlOverview({
  stats,
  isPending = false,
  isError = false,
  errorMessage,
  onRetry,
}: {
  stats?: OverviewStatsDto;
  isPending?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
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

  if (isError || !stats) {
    return (
      <Card>
        <CardContent>
          <ErrorState
            className="py-8"
            title="Could not load overview"
            message={errorMessage}
            onRetry={onRetry}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Links" value={stats.links} />
      <StatCard label="Clicks" value={stats.clicks} />
      <StatCard label="Unique visitors" value={stats.uniqueVisitors} />
      <StatCard label="Active" value={stats.active} />
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
