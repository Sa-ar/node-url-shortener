import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/register-form";
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
    <main className="mx-auto flex w-full max-w-5xl flex-1 items-center justify-center px-4 py-10">
      <RegisterForm invite={invite.trim()} />
    </main>
  );
}
