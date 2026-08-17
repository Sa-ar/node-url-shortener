"use client";

import { useQueryClient } from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { QUERY_PERSIST_KEY } from "@/lib/query";

export function SignOutButton() {
  const queryClient = useQueryClient();

  return (
    <Button
      type="button"
      variant="outline"
      className="rounded-full"
      onClick={() => {
        queryClient.clear();
        try {
          sessionStorage.removeItem(QUERY_PERSIST_KEY);
        } catch {
          // Ignore storage failures.
        }
        void signOut({ callbackUrl: "/login" });
      }}
    >
      Sign out
    </Button>
  );
}
