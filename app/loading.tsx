import { LoadingState } from "@/components/query-state";

export default function Loading() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-16">
      <LoadingState label="Loading…" />
    </main>
  );
}
