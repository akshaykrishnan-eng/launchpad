"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { logout } from "@/lib/auth/client";

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleClick() {
    setIsLoggingOut(true);
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <button type="button" onClick={handleClick} disabled={isLoggingOut}>
      {isLoggingOut ? "Logging out..." : "Log out"}
    </button>
  );
}
