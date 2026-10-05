"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/StatusBadge";
import { getHealth } from "@/lib/api";

type ConnectionState = "checking" | "connected" | "disconnected";

export function BackendStatus() {
  const [state, setState] = useState<ConnectionState>("checking");

  useEffect(() => {
    let isMounted = true;

    getHealth()
      .then((health) => {
        if (isMounted) {
          setState(health.status === "ok" ? "connected" : "disconnected");
        }
      })
      .catch(() => {
        if (isMounted) {
          setState("disconnected");
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (state === "checking") {
    return <StatusBadge label="Backend: Checking..." isPositive={false} />;
  }

  return (
    <StatusBadge
      label={state === "connected" ? "Backend: Connected" : "Backend: Not Connected"}
      isPositive={state === "connected"}
    />
  );
}
