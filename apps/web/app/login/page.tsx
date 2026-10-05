import { LoginForm } from "@/features/auth/LoginForm";

export default function LoginPage() {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
      }}
    >
      <h1>Sign in</h1>
      <LoginForm />
    </main>
  );
}
