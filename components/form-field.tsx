import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
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
      <Label htmlFor={htmlFor} className="h-5 truncate leading-5">
        {label}
      </Label>
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
