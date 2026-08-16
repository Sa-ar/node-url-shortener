import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-primary">
        saar.to
      </p>
      <h1 className="font-heading text-3xl font-semibold tracking-tight">
        Link not found
      </h1>
      <p className="text-muted-foreground">
        This short URL does not exist or has expired.
      </p>
      <Button className="rounded-full shadow-[0_0_24px_rgb(249_208_38/0.25)]" render={<Link href="/" />}>Back to home</Button>
    </main>
  );
}
