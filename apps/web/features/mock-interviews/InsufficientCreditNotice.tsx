import Link from "next/link";

export function InsufficientCreditNotice({ available }: { available: number }) {
  return (
    <section className="card card-dashed">
      <p style={{ fontWeight: 600 }}>You don&apos;t have enough Mock Interview credits.</p>
      <p style={{ color: "var(--color-text-secondary)", marginTop: "0.5rem" }}>
        Mock Interview credits required: 1
        <br />
        Available: {available}
      </p>
      <Link href="/app/credits" className="btn-primary" style={{ marginTop: "0.875rem", display: "inline-flex" }}>
        View Credits
      </Link>
    </section>
  );
}
