"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  createInvite,
  fetchInvites,
  revokeInvite,
  type InviteDto,
} from "@/lib/api";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
  toast.success("Invite link copied");
}

export function InviteDialog() {
  const queryClient = useQueryClient();
  const invitesQuery = useQuery({
    queryKey: ["invites"],
    queryFn: fetchInvites,
  });

  const createMutation = useMutation({
    mutationFn: createInvite,
    onSuccess: async (invite) => {
      await copyText(invite.url);
      void queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeInvite,
    onSuccess: () => {
      toast.success("Invite revoked");
      void queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" className="rounded-full" />
        }
      >
        <UserPlus data-icon="inline-start" />
        Invite
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite someone</DialogTitle>
          <DialogDescription>
            One-time links expire in 7 days. Recipients register as members and
            only see their own links.
          </DialogDescription>
        </DialogHeader>

        <Button
          type="button"
          className="rounded-full"
          disabled={createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending
            ? "Creating…"
            : "Create invite and copy link"}
        </Button>

        <div className="space-y-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Pending
          </p>
          {invitesQuery.isPending ? (
            <p className="text-sm text-muted-foreground">Loading invites…</p>
          ) : invitesQuery.isError ? (
            <p className="text-sm text-destructive">
              {invitesQuery.error instanceof Error
                ? invitesQuery.error.message
                : "Could not load invites"}
            </p>
          ) : (invitesQuery.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No open invites.</p>
          ) : (
            <ul className="space-y-2">
              {(invitesQuery.data as InviteDto[]).map((invite) => (
                <li
                  key={invite.id}
                  className="flex items-start justify-between gap-2 rounded-lg border px-3 py-2"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-mono text-xs">{invite.url}</p>
                    <p className="text-xs text-muted-foreground">
                      Expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copy invite"
                      onClick={() => {
                        void copyText(invite.url);
                      }}
                    >
                      <Copy />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Revoke invite"
                      disabled={revokeMutation.isPending}
                      onClick={() => revokeMutation.mutate(invite.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
