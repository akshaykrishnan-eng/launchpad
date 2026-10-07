type FutureModuleCardProps = {
  title: string;
};

/** Honest placeholder for a module that doesn't exist yet -- no fake
 * data, no fake functionality behind it. Phase 4's "no fake data" rule
 * applies here: this card renders the same "Coming soon" state for
 * every future module, regardless of what the real feature will look
 * like, so there's nothing to accidentally mistake for real data. */
export function FutureModuleCard({ title }: FutureModuleCardProps) {
  return (
    <div
      aria-label={`${title}: coming soon`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.75rem 1rem",
        borderRadius: "var(--radius-md)",
        border: "1px dashed var(--color-border)",
      }}
    >
      <h2 style={{ fontSize: "0.9375rem", color: "var(--color-text-secondary)", fontWeight: 600 }}>{title}</h2>
      <span className="badge badge-neutral">Coming soon</span>
    </div>
  );
}
