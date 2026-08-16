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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create a saar.to link</DialogTitle>
          <DialogDescription>
            Paste a destination. An optional slug becomes saar.to/your-slug.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <UrlForm
            onCreated={() => {
              onOpenChange(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
