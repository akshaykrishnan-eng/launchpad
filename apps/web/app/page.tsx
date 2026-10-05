import { BackendStatus } from "@/features/health/BackendStatus";

export default function Home() {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700 }}>Ellow Launchpad</h1>
      <p style={{ fontSize: "1.125rem", opacity: 0.75 }}>Development Environment</p>
      <BackendStatus />
    </main>
  );
}
