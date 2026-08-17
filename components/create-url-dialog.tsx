"use client";

import { UrlForm } from "@/components/url-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateUrlDialog({
  open,
  onOpenChange,
  isOwner = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isOwner?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,40rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a saar.to link</DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Paste a URL or attach a file. Premium and extras live under Options."
              : "Paste a URL or attach a file. Password, note, and preview live under Options."}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <UrlForm
            isOwner={isOwner}
            onSaved={() => {
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
