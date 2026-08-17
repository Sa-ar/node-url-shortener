import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
import { PageShell } from "@/components/page-shell";
import { connectDB } from "@/lib/db";
import { findValidInvite } from "@/lib/invites";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  if (!invite?.trim()) {
    redirect("/login");
  }

  await connectDB();
  const valid = await findValidInvite(invite);

  if (!valid) {
    redirect("/login?error=invite");
  }

  return (
    <PageShell className="items-center justify-center">
      <RegisterForm invite={invite.trim()} />
    </PageShell>
  );
}
