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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a saar.to link</DialogTitle>
          <DialogDescription>
            {isOwner
              ? "Paste a destination. Use a custom slug for saar.to/slug, or Premium for slug.saar.to."
              : "Paste a destination. An optional slug becomes saar.to/your-slug."}
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
