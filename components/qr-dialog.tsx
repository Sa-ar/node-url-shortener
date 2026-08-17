"use client";

import { QRCodeSVG } from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function QrDialog({
  url,
  shortUrl,
  onOpenChange,
}: {
  url: string | null;
  shortUrl: string | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={url !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>QR code</DialogTitle>
          <DialogDescription className="font-mono text-xs break-all">
            {shortUrl}
          </DialogDescription>
        </DialogHeader>
        {url ? (
          <div className="flex justify-center rounded-xl bg-background p-4 ring-1 ring-border">
            <QRCodeSVG
              value={url}
              size={200}
              bgColor="#0a0512"
              fgColor="#F9D026"
              title={url}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
