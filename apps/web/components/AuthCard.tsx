import type { ReactNode } from "react";

type AuthCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

/** The centered logo/title/card wrapper shared by the login and
 * register pages -- previously copy-pasted between the two verbatim. */
export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <main
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        background: "var(--color-background)",
      }}
    >
      <div className="card" style={{ width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div style={{ textAlign: "center" }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              width: "2.5rem",
              height: "2.5rem",
              borderRadius: "var(--radius-md)",
              // --color-primary-hover, not --color-primary: see the
              // contrast note in globals.css.
              background: "var(--color-primary-hover)",
              color: "var(--color-text-on-primary)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            L
          </span>
          <h1 style={{ fontSize: "1.5rem" }}>{title}</h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{description}</p>
        </div>

        {children}

        <p style={{ textAlign: "center", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          {footer}
        </p>
      </div>
    </main>
  );
}
