"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchUrl, isApiError } from "@/lib/api";
import { formatDate, formatDay } from "@/lib/format";
import { lastNDays } from "@/lib/dates";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function UrlStats({ code }: { code: string }) {
  const query = useQuery({
    queryKey: ["url", code],
    queryFn: () => fetchUrl(code),
  });

  if (query.isPending) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <LoadingState label="Loading stats…" className="py-8" />
      </main>
    );
  }

  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;

    if (notFound) {
      return (
        <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            saar.to
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Link not found
          </h1>
          <p className="text-muted-foreground">
            This short URL does not exist or could not be loaded.
          </p>
          <Button className="rounded-full" render={<Link href="/" />}>
            Back to home
          </Button>
        </main>
      );
    }

    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-16">
        <ErrorState
          title="Could not load stats"
          message={
            query.error instanceof Error
              ? query.error.message
              : "Request failed"
          }
          onRetry={() => {
            void query.refetch();
          }}
          action={
            <Button
              variant="outline"
              className="rounded-full"
              render={<Link href="/" />}
            >
              Back to home
            </Button>
          }
        />
      </main>
    );
  }

  if (!query.data) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
          saar.to
        </p>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Link not found
        </h1>
        <p className="text-muted-foreground">
          This short URL does not exist or could not be loaded.
        </p>
        <Button className="rounded-full" render={<Link href="/" />}>
          Back to home
        </Button>
      </main>
    );
  }

  const url = query.data;
  const days = lastNDays(url.dailyClicks, 14);
  const totalRecent = days.reduce((sum, day) => sum + day.count, 0);
  const maxClicks = Math.max(1, ...days.map((day) => day.count));

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            saar.to
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            {url.short}
          </h1>
          <p className="text-sm text-muted-foreground">
            Click activity for the last 14 days.
          </p>
        </div>
        <Button variant="outline" className="rounded-full" render={<Link href="/" />}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {url.shortUrl}
            {url.expired ? (
              <Badge variant="destructive">Expired</Badge>
            ) : (
              <Badge variant="secondary">Active</Badge>
            )}
          </CardTitle>
          <CardDescription>
            <a
              href={url.full}
              className="break-all underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {url.full}
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <Stat label="Clicks" value={String(url.clicks)} />
          <Stat label="Created" value={formatDate(url.createdAt)} />
          <Stat label="Last accessed" value={formatDate(url.lastAccessedAt)} />
          <Stat label="Expires" value={formatDate(url.expiresAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily clicks</CardTitle>
          <CardDescription>UTC days, last two weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          {totalRecent === 0 ? (
            <EmptyState
              className="py-8"
              title="No clicks yet"
              description="Traffic in the last 14 days will show up here."
            />
          ) : (
            <div className="flex h-40 items-end gap-1">
              {days.map((day) => (
                <div
                  key={day.date}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
                >
                  <div
                    className="w-full rounded-sm bg-primary shadow-[0_0_10px_rgb(249_208_38/0.35)]"
                    style={{ height: `${(day.count / maxClicks) * 100}%` }}
                    title={`${day.date}: ${day.count}`}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {formatDay(day.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="font-heading text-lg font-medium">{value}</p>
    </div>
  );
}
