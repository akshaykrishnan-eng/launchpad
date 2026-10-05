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
    <section
      aria-label={`${title}: coming soon`}
      style={{
        border: "1px dashed #d1d5db",
        borderRadius: "0.75rem",
        padding: "1.5rem",
        opacity: 0.7,
      }}
    >
      <h2 style={{ fontSize: "1.125rem", fontWeight: 600 }}>{title}</h2>
      <p>Coming soon</p>
    </section>
  );
}
