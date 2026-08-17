"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/query-state";
import { PageShell } from "@/components/page-shell";

export default function Error({
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
    <PageShell className="items-center justify-center py-16">
      <ErrorState
        title="Something went wrong"
        message={error.message || "An unexpected error occurred."}
        onRetry={reset}
      />
    </PageShell>
  );
}
