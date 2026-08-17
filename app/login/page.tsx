import { LoginForm } from "@/components/login-form";
import { PageShell } from "@/components/page-shell";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <PageShell className="items-center justify-center gap-4">
      {error === "invite" ? (
        <p className="max-w-md text-center text-sm text-destructive">
          That invite is invalid or expired. Ask the owner for a new link.
        </p>
      ) : null}
      <LoginForm />
    </PageShell>
  );
}
