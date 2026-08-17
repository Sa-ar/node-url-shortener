"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { BarChart3, Check, Copy, Link2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteUrl } from "@/lib/api";
import { isExpiringSoon } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import type { ShortUrlDto } from "@/lib/types";
import { EditUrlDialog } from "@/components/edit-url-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/query-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
  },
});

const columnHelper = createColumnHelper<typeof features, ShortUrlDto>();

export function UrlTable({
  urls,
  isPending,
  isError,
  errorMessage,
  hasLinks,
  hasActiveFilters,
  totalCount,
  isOwner = false,
  onRetry,
  onCreate,
  onClearFilters,
}: {
  urls: ShortUrlDto[];
  isPending: boolean;
  isError: boolean;
  errorMessage?: string;
  hasLinks: boolean;
  hasActiveFilters: boolean;
  totalCount: number;
  isOwner?: boolean;
  onRetry?: () => void;
  onCreate: () => void;
  onClearFilters: () => void;
}) {
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<ShortUrlDto | null>(null);
  const [editing, setEditing] = useState<ShortUrlDto | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const deleteMutation = useMutation({
    mutationFn: deleteUrl,
    onSuccess: () => {
      toast.success("Short URL deleted");
      setPendingDelete(null);
      void queryClient.invalidateQueries({ queryKey: ["urls"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const copyShortUrl = async (row: ShortUrlDto) => {
    try {
      await navigator.clipboard.writeText(row.shortUrl);
      setCopiedId(row.id);
      toast.success("Copied to clipboard", { description: row.shortUrl });
      window.setTimeout(() => {
        setCopiedId((current) => (current === row.id ? null : current));
      }, 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const columns = useMemo(
    () =>
      columnHelper.columns([
        columnHelper.accessor("full", {
          header: "Full URL",
          enableSorting: false,
          cell: (info) => (
            <a
              href={info.getValue()}
              className="block max-w-[220px] truncate text-primary underline-offset-4 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              {info.getValue()}
            </a>
          ),
        }),
        columnHelper.accessor("shortUrl", {
          header: "Short URL",
          enableSorting: false,
          cell: (info) => {
            const row = info.row.original;
            return (
              <div className="flex flex-col gap-1">
                <a
                  href={info.getValue()}
                  className="font-mono text-sm text-primary underline-offset-4 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {row.kind === "subdomain" ? row.shortUrl.replace(/^https?:\/\//, "") : row.short}
                </a>
                {row.kind === "subdomain" ? (
                  <Badge variant="outline" className="w-fit border-primary/40 text-primary">
                    Premium
                  </Badge>
                ) : null}
              </div>
            );
          },
        }),
        columnHelper.accessor("clicks", {
          header: "Clicks",
          sortFn: "alphanumeric",
        }),
        columnHelper.accessor("expiresAt", {
          header: "Expiry",
          enableSorting: false,
          cell: (info) => {
            const row = info.row.original;
            if (row.expired) {
              return <Badge variant="destructive">Expired</Badge>;
            }
            if (!row.expiresAt) {
              return <span className="text-muted-foreground">Never</span>;
            }
            return (
              <div className="flex flex-col items-start gap-1">
                <span>{formatDate(row.expiresAt)}</span>
                {isExpiringSoon(row.expiresAt) ? (
                  <Badge
                    variant="outline"
                    className="border-amber-500/50 text-amber-500"
                  >
                    Expiring soon
                  </Badge>
                ) : null}
              </div>
            );
          },
        }),
        columnHelper.display({
          id: "actions",
          header: "Actions",
          cell: (info) => {
            const row = info.row.original;
            const copied = copiedId === row.id;
            return (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={copied ? "Copied" : "Copy short URL"}
                  onClick={() => {
                    void copyShortUrl(row);
                  }}
                >
                  {copied ? <Check className="text-primary" /> : <Copy />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Edit short URL"
                  onClick={() => setEditing(row)}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="View stats"
                  render={<Link href={`/stats/${row.short}`} />}
                >
                  <BarChart3 />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete short URL"
                  onClick={() => setPendingDelete(row)}
                >
                  <Trash2 />
                </Button>
              </div>
            );
          },
        }),
      ]),
    [copiedId]
  );

  const table = useTable({
    features,
    columns,
    data: urls,
    getRowId: (row) => row.id,
  });

  const showingCount = hasActiveFilters
    ? `Showing ${urls.length} of ${totalCount} links.`
    : `${totalCount} ${totalCount === 1 ? "link" : "links"}.`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your saar.to links</CardTitle>
        <CardDescription>
          {hasLinks ? `${showingCount} ` : ""}
          Sort by clicks. Copy, edit, inspect stats, or delete a short URL.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <LoadingState label="Loading links…" />
        ) : isError ? (
          <ErrorState
            title="Could not load links"
            message={errorMessage}
            onRetry={onRetry}
          />
        ) : !hasLinks ? (
          <EmptyState
            icon={
              <Link2 className="size-8 text-primary drop-shadow-[0_0_12px_rgb(249_208_38/0.55)]" />
            }
            title="No short URLs yet"
            description="Create a saar.to link to start tracking clicks."
            action={
              <Button type="button" className="rounded-full" onClick={onCreate}>
                Create a new link
              </Button>
            }
          />
        ) : urls.length === 0 ? (
          <EmptyState
            title="No links match these filters"
            description="Try a different search or status."
            action={
              hasActiveFilters ? (
                <Button type="button" variant="outline" onClick={onClearFilters}>
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1"
                            onClick={header.column.getToggleSortingHandler()}
                          >
                            <table.FlexRender header={header} />
                            <span className="text-muted-foreground">
                              {header.column.getIsSorted() === "asc"
                                ? "↑"
                                : header.column.getIsSorted() === "desc"
                                  ? "↓"
                                  : ""}
                            </span>
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getAllCells().map((cell) => (
                    <TableCell key={cell.id}>
                      <table.FlexRender cell={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <EditUrlDialog
        url={editing}
        isOwner={isOwner}
        onOpenChange={(open) => {
          if (!open) {
            setEditing(null);
          }
        }}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this short URL?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? pendingDelete.kind === "subdomain"
                  ? `${pendingDelete.shortUrl} will stop redirecting to ${pendingDelete.full}.`
                  : `${pendingDelete.short} will stop redirecting to ${pendingDelete.full}.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (pendingDelete) {
                  deleteMutation.mutate(pendingDelete.id);
                }
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
