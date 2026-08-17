import { Dashboard } from "@/components/dashboard";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();
  const isOwner = session?.user?.role === "owner";

  return <Dashboard isOwner={isOwner} />;
}
