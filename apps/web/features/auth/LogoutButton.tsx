"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";

import { logout } from "@/lib/auth/client";

type LogoutButtonProps = {
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  "aria-label"?: string;
};

export function LogoutButton({ className, style, children, "aria-label": ariaLabel }: LogoutButtonProps) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleClick() {
    setIsLoggingOut(true);
    await logout();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoggingOut}
      className={className}
      style={style}
      aria-label={ariaLabel}
    >
      {isLoggingOut ? "Logging out..." : (children ?? "Log out")}
    </button>
  );
}
