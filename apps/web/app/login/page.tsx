import Link from "next/link";

import { AuthCard } from "@/components/AuthCard";
import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Welcome back to Launchpad."
      footer={
        <>
          Don&apos;t have an account? <Link href="/register">Create one</Link>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
