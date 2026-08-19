"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch({ checked, className, onCheckedChange, ...props }, ref) {
    return (
      <button
        {...props}
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        className={cn(
          "inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent bg-muted transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-[state=checked]:bg-primary disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        onClick={(event) => {
          props.onClick?.(event);
          if (!event.defaultPrevented) {
            onCheckedChange?.(!checked);
          }
        }}
      >
        <span
          aria-hidden="true"
          className={cn(
            "block size-5 rounded-full bg-background shadow-sm transition-transform data-[state=checked]:translate-x-5",
            checked ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    );
  }
);
