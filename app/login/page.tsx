import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-4 px-4 py-10">
      {error === "invite" ? (
        <p className="max-w-md text-center text-sm text-destructive">
          That invite is invalid or expired. Ask the owner for a new link.
        </p>
      ) : null}
      <LoginForm />
    </main>
  );
}
