"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  completeRegistration,
  login,
  resendEmailVerification,
  startEmailVerification,
  verifyEmailOtp,
} from "@/lib/auth/client";

type Step = "email" | "otp" | "password";

// UX hint only -- matches the backend's otp_resend_cooldown_seconds
// default (see apps/api/app/core/config.py). The server is what
// actually enforces the cooldown (429 on an early resend); this just
// keeps the button disabled so a candidate doesn't hit that in the
// first place.
const RESEND_COOLDOWN_SECONDS = 60;

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "1.125rem",
  width: "100%",
};

const linkButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--color-primary)",
  padding: 0,
  font: "inherit",
  cursor: "pointer",
};

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [registrationToken, setRegistrationToken] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await startEmailVerification(email);
    setIsSubmitting(false);

    if (!result.ok) {
      setAlreadyRegistered(result.alreadyRegistered === true);
      setError(result.error);
      return;
    }
    setAlreadyRegistered(false);

    setRegistrationToken(result.registrationToken);
    setOtp("");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
    setStep("otp");
  }

  async function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registrationToken) return;
    setError(null);
    setIsSubmitting(true);

    const result = await verifyEmailOtp(registrationToken, otp);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setStep("password");
  }

  async function handleResend() {
    if (!registrationToken || resendCooldown > 0 || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);

    const result = await resendEmailVerification(registrationToken);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setOtp("");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  function handleChangeEmail() {
    setStep("email");
    setRegistrationToken(null);
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setAlreadyRegistered(false);
    setResendCooldown(0);
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!registrationToken) return;

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const completeResult = await completeRegistration(registrationToken, password);
    if (!completeResult.ok) {
      setIsSubmitting(false);
      setError(completeResult.error);
      return;
    }

    // The account now exists -- continue through the exact same login
    // call LoginForm makes, rather than inventing a second way to
    // establish a session. If it somehow fails here (e.g. a dropped
    // request), the account itself was still created successfully, so
    // falling back to the login page is a safe, recoverable landing.
    const loginResult = await login(email, password);
    setIsSubmitting(false);

    if (!loginResult.ok) {
      router.push("/login");
      return;
    }

    router.push(loginResult.redirectTo);
    router.refresh();
  }

  if (step === "email") {
    return (
      <form onSubmit={handleEmailSubmit} style={formStyle}>
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
        {error && (
          <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
            {error}
            {alreadyRegistered && (
              <>
                {" "}
                <Link href="/login" style={{ color: "var(--color-danger)", fontWeight: 600 }}>
                  Sign in instead →
                </Link>
              </>
            )}
          </p>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting}
          style={{ width: "100%" }}
        >
          {isSubmitting ? "Sending code..." : "Continue"}
        </button>
      </form>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={handleOtpSubmit} style={formStyle}>
        <h2 style={{ fontSize: "1.0625rem" }}>Verify your email</h2>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9375rem", marginTop: "-0.5rem" }}>
          We sent a verification code to <strong>{email}</strong>.
        </p>
        <label>
          Verification code
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="123456"
          />
        </label>
        {error && (
          <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn-primary"
          disabled={isSubmitting || otp.length !== 6}
          style={{ width: "100%" }}
        >
          {isSubmitting ? "Verifying..." : "Verify email"}
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
          <button type="button" onClick={handleChangeEmail} style={linkButtonStyle}>
            Change email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || isSubmitting}
            style={{
              ...linkButtonStyle,
              color: resendCooldown > 0 ? "var(--color-text-secondary)" : "var(--color-primary)",
              cursor: resendCooldown > 0 ? "default" : "pointer",
            }}
          >
            {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handlePasswordSubmit} style={formStyle}>
      <h2 style={{ fontSize: "1.0625rem" }}>Create your password</h2>
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
      <button
        type="submit"
        className="btn-primary"
        disabled={isSubmitting}
        style={{ width: "100%" }}
      >
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
