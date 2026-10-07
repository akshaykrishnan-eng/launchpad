"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { registerAccount } from "@/lib/auth/client";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    const result = await registerAccount(email, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    router.push("/login");
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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Create a password"
        />
      </label>
      <label>
        Confirm password
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          placeholder="Re-enter your password"
        />
      </label>
      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}
      <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ width: "100%" }}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
