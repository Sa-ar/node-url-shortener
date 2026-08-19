import { CreateLinkPage } from "@/components/create-link-page";
import { getSession } from "@/lib/auth";

export default async function NewLinkRoute() {
  const session = await getSession();
  const isOwner = session?.user?.role === "owner";

  return <CreateLinkPage isOwner={isOwner} />;
}
