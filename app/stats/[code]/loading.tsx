import { LoadingState } from "@/components/query-state";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsLoading() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-10">
      <div className="space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      <LoadingState label="Loading stats…" className="py-8" />
    </main>
  );
}
