import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  requirement,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  /** Shown next to the label in smaller type, e.g. Required / Optional. */
  requirement?: string;
  /** Example or helper text under the field. */
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid grid-rows-[auto_2.25rem_1.25rem] items-start gap-2",
        className
      )}
    >
      <div className="flex h-5 min-w-0 items-baseline gap-2 leading-5">
        <Label htmlFor={htmlFor} className="truncate leading-5">
          {label}
        </Label>
        {requirement ? (
          <span className="shrink-0 text-[11px] font-normal text-muted-foreground">
            {requirement}
          </span>
        ) : null}
      </div>
      {children}
      <p
        className={cn(
          "truncate text-xs leading-5",
          error ? "text-destructive" : "text-muted-foreground"
        )}
      >
        {error ?? hint ?? "\u00a0"}
      </p>
    </div>
  );
}
