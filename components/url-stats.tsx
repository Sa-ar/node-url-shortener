"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { fetchUrl, fetchUrlClicks, isApiError } from "@/lib/api";
import { formatDate, formatDay } from "@/lib/format";
import { urlClicksQueryKey, urlQueryKey } from "@/lib/query";
import type { ClickBreakdownEntry, ClickEventDto } from "@/lib/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const dailyClicksChartConfig = {
  clicks: {
    label: "Clicks",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function UrlStats({ code }: { code: string }) {
  const [excludeBots, setExcludeBots] = useState(false);
  const query = useQuery({
    queryKey: urlQueryKey(code),
    queryFn: () => fetchUrl(code),
  });
  const clicksQuery = useQuery({
    enabled: Boolean(query.data),
    queryKey: urlClicksQueryKey(code, excludeBots),
    queryFn: () => fetchUrlClicks(code, excludeBots),
  });

  if (query.isPending) {
    return (
      <PageShell className="gap-6">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
        <LoadingState label="Loading stats..." className="py-8" />
      </PageShell>
    );
  }

  if (query.isError) {
    const notFound = isApiError(query.error) && query.error.status === 404;

    if (notFound) {
      return <NotFoundState />;
    }

    return (
      <PageShell className="items-center justify-center py-16">
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
      </PageShell>
    );
  }

  if (!query.data) {
    return <NotFoundState />;
  }

  const url = query.data;
  const clicks = clicksQuery.data;
  const chartData = (clicks?.daily ?? []).map((day) => ({
    date: day.date,
    clicks: day.count,
  }));
  const totalRecent = chartData.reduce((sum, day) => sum + day.clicks, 0);

  return (
    <PageShell className="gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            saar.to
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            {url.short}
          </h1>
          <p className="text-sm text-muted-foreground">
            Detailed traffic for this short URL, including bot filtering and recent hits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-3 rounded-full border px-3 py-2 text-sm">
            <span className="font-medium">Hide bots</span>
            <Switch checked={excludeBots} onCheckedChange={setExcludeBots} />
          </label>
          <Button variant="outline" className="rounded-full" render={<Link href="/" />}>
            Back
          </Button>
        </div>
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
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Stat label="Clicks" value={clicks ? String(clicks.clicks) : "..."} />
          <Stat
            label="Unique visitors"
            value={clicks ? String(clicks.uniqueVisitors) : "..."}
          />
          <Stat label="Created" value={formatDate(url.createdAt)} />
          <Stat label="Last accessed" value={formatDate(url.lastAccessedAt)} />
          <Stat label="Expires" value={formatDate(url.expiresAt)} />
        </CardContent>
      </Card>

      {clicksQuery.isError ? (
        <Card>
          <CardContent>
            <ErrorState
              className="py-8"
              title="Could not load click analytics"
              message={
                clicksQuery.error instanceof Error
                  ? clicksQuery.error.message
                  : "Request failed"
              }
              onRetry={() => {
                void clicksQuery.refetch();
              }}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Daily clicks</CardTitle>
          <CardDescription>UTC days, last two weeks.</CardDescription>
        </CardHeader>
        <CardContent>
          {clicksQuery.isPending ? (
            <LoadingState label="Loading chart..." className="py-8" />
          ) : totalRecent === 0 ? (
            <EmptyState
              className="py-8"
              title="No clicks yet"
              description="Traffic in the last 14 days will show up here."
            />
          ) : (
            <ChartContainer
              config={dailyClicksChartConfig}
              className="aspect-auto h-[200px] w-full"
            >
              <BarChart
                accessibilityLayer
                data={chartData}
                margin={{ left: 8, right: 8 }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => formatDay(String(value))}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(value) => formatDay(String(value))}
                    />
                  }
                />
                <Bar dataKey="clicks" fill="var(--color-clicks)" radius={4} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownCard
          title="Country"
          description="Traffic by country"
          items={clicks?.breakdowns.country ?? []}
          isPending={clicksQuery.isPending}
        />
        <BreakdownCard
          title="Referrer"
          description="Traffic by referrer host"
          items={clicks?.breakdowns.referrer ?? []}
          isPending={clicksQuery.isPending}
        />
        <BreakdownCard
          title="Device"
          description="Traffic by device type"
          items={clicks?.breakdowns.device ?? []}
          isPending={clicksQuery.isPending}
        />
        <BreakdownCard
          title="Browser"
          description="Traffic by browser family"
          items={clicks?.breakdowns.browser ?? []}
          isPending={clicksQuery.isPending}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent hits</CardTitle>
          <CardDescription>Newest 50 click events.</CardDescription>
        </CardHeader>
        <CardContent>
          {clicksQuery.isPending ? (
            <LoadingState label="Loading recent hits..." className="py-8" />
          ) : !clicks || clicks.recent.length === 0 ? (
            <EmptyState
              className="py-8"
              title="No recent hits"
              description="New click events will appear here after redirects succeed."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Browser</TableHead>
                    <TableHead>Referrer</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clicks.recent.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>{formatDate(event.createdAt)}</TableCell>
                      <TableCell>{formatLocation(event)}</TableCell>
                      <TableCell className="capitalize">{event.deviceType}</TableCell>
                      <TableCell>{event.browser}</TableCell>
                      <TableCell>{event.referrerHost}</TableCell>
                      <TableCell className="font-mono text-xs">{event.ip || "—"}</TableCell>
                      <TableCell>
                        {event.isBot ? <Badge variant="outline">Bot</Badge> : <Badge variant="secondary">Human</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}

function BreakdownCard({
  title,
  description,
  items,
  isPending,
}: {
  title: string;
  description: string;
  items: ClickBreakdownEntry[];
  isPending: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <LoadingState label={`Loading ${title.toLowerCase()}...`} className="py-8" />
        ) : items.length === 0 ? (
          <EmptyState
            className="py-8"
            title="No data yet"
            description="Breakdowns appear after click events are recorded."
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{item.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max((item.count / items[0].count) * 100, 8)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
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

function formatLocation(event: ClickEventDto) {
  const parts = [event.country, event.city].filter(
    (value) => value && value !== "(unknown)"
  );

  return parts.length > 0 ? parts.join(" / ") : "(unknown)";
}

function NotFoundState() {
  return (
    <PageShell className="items-center justify-center gap-4 py-16 text-center">
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
    </PageShell>
  );
}
