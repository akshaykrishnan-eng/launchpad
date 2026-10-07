import type { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

/** The consistent "Title + short description" header used at the top
 * of every authenticated page (dashboard, Resume Centre, LinkedIn
 * Centre, Mock Interviews, Profile). */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        flexWrap: "wrap",
        gap: "1rem",
        marginBottom: "1.5rem",
      }}
    >
      <div>
        <h1>{title}</h1>
        {description && (
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
