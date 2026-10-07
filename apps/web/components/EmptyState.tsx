import type { ReactNode } from "react";

type EmptyStateProps = {
  heading: string;
  description: string;
  action?: ReactNode;
};

/** The shared empty-state pattern used across Resume, LinkedIn, and
 * Mock Interview Centre: a clear heading, a short explanation, and an
 * optional primary action -- never just "No data." */
export function EmptyState({ heading, description, action }: EmptyStateProps) {
  return (
    <section className="card card-dashed" style={{ textAlign: "center" }}>
      <p style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{heading}</p>
      <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{description}</p>
      {action && <div style={{ marginTop: "1rem" }}>{action}</div>}
    </section>
  );
}
