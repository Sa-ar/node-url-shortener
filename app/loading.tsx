import { PageShell } from "@/components/page-shell";
import { LoadingState } from "@/components/query-state";

export default function Loading() {
  return (
    <PageShell className="items-center justify-center py-16">
      <LoadingState label="Loading…" />
    </PageShell>
  );
}
