"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/query-state";

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
    <main className="mx-auto flex w-full max-w-lg flex-1 items-center justify-center px-4 py-16">
      <ErrorState
        title="Something went wrong"
        message={error.message || "An unexpected error occurred."}
        onRetry={reset}
      />
    </main>
  );
}
