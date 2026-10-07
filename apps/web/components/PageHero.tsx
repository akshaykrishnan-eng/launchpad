import type { ReactNode } from "react";

type PageHeroProps = {
  eyebrow: ReactNode;
  metric: ReactNode;
  description?: ReactNode;
  status?: ReactNode;
  secondaryAction?: ReactNode;
  action?: ReactNode;
  ariaLabel?: string;
};

/** The shared blue contextual banner for a major candidate page's main
 * content: a brand-forward summary of "where am I / what's the current
 * state" (eyebrow + headline metric, optionally a description/status),
 * paired with the page's primary action. Builds on the same
 * `.hero-panel` surface DashboardHero and Mock Interviews already
 * established in earlier phases -- this gives Credits, Resume, and
 * LinkedIn the same pattern instead of three hand-rolled variants. */
export function PageHero({
  eyebrow,
  metric,
  description,
  status,
  secondaryAction,
  action,
  ariaLabel,
}: PageHeroProps) {
  return (
    <section aria-label={ariaLabel} className="hero-panel">
      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p className="hero-eyebrow">{eyebrow}</p>
          <p className="hero-title">{metric}</p>
          {description && <p className="hero-subtitle">{description}</p>}
          {status && <div style={{ marginTop: "0.625rem" }}>{status}</div>}
          {secondaryAction && <div style={{ marginTop: "0.5rem" }}>{secondaryAction}</div>}
        </div>
        {action && <div style={{ minWidth: 0, maxWidth: "100%", position: "relative" }}>{action}</div>}
      </div>
    </section>
  );
}
