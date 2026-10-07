import Link from "next/link";

import { AuthCard } from "@/components/AuthCard";
import { RegisterForm } from "@/features/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your account"
      description="Start building your career journey."
      footer={
        <>
          Already have an account? <Link href="/login">Sign in</Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
