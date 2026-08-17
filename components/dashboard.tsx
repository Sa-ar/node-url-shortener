"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { fetchUrls } from "@/lib/api";
import {
  filterUrls,
  type LinkStatusFilter,
} from "@/lib/dashboard";
import { CreateUrlDialog } from "@/components/create-url-dialog";
import { InviteDialog } from "@/components/invite-dialog";
import { UrlOverview } from "@/components/url-overview";
import { UrlTable } from "@/components/url-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function Dashboard({ isOwner = false }: { isOwner?: boolean }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LinkStatusFilter>("all");
  const query = useQuery({
    queryKey: ["urls"],
    queryFn: fetchUrls,
  });

  const allUrls = useMemo(() => query.data ?? [], [query.data]);
  const filteredUrls = useMemo(
    () => filterUrls(allUrls, search, status),
    [allUrls, search, status]
  );
  const hasActiveFilters = search.trim() !== "" || status !== "all";

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
            saar.to
          </p>
          <h1 className="font-heading text-4xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="max-w-xl text-muted-foreground">
            Filter your links and watch the totals update. New short URLs go out
            as saar.to/your-slug.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isOwner ? <InviteDialog /> : null}
          <Button
            type="button"
            className="rounded-full shadow-[0_0_24px_rgb(249_208_38/0.25)]"
            onClick={() => setCreateOpen(true)}
          >
            <Plus data-icon="inline-start" />
            Create link
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search URL or slug"
          aria-label="Search URL or slug"
          className="sm:max-w-sm"
        />
        <Select
          value={status}
          onValueChange={(value) => {
            if (value === "all" || value === "active" || value === "expired") {
              setStatus(value);
            }
          }}
        >
          <SelectTrigger className="h-9 w-full sm:w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <UrlOverview urls={query.isPending ? [] : filteredUrls} />

      <UrlTable
        urls={filteredUrls}
        isPending={query.isPending}
        isError={query.isError}
        errorMessage={
          query.error instanceof Error ? query.error.message : undefined
        }
        hasLinks={allUrls.length > 0}
        hasActiveFilters={hasActiveFilters}
        onCreate={() => setCreateOpen(true)}
        onClearFilters={() => {
          setSearch("");
          setStatus("all");
        }}
      />

      <CreateUrlDialog open={createOpen} onOpenChange={setCreateOpen} />
    </main>
  );
}
