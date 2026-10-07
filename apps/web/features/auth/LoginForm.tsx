"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { login } from "@/lib/auth/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push(result.redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.125rem", width: "100%" }}>
      <label>
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="Enter your email"
        />
      </label>
      <label>
        Password
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          placeholder="Enter your password"
        />
      </label>
      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: "100%" }}>
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
