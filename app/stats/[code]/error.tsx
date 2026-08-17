"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ErrorState } from "@/components/query-state";
import { Button } from "@/components/ui/button";

export default function StatsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-16">
      <ErrorState
        title="Could not load stats"
        message={error.message || "An unexpected error occurred."}
        onRetry={reset}
        action={
          <Button
            variant="outline"
            className="rounded-full"
            render={<Link href="/" />}
          >
            Back to home
          </Button>
        }
      />
    </main>
  );
}
