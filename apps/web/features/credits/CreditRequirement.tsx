import Link from "next/link";

import { CREDIT_LABELS } from "@/lib/credits/types";
import type { CreditType } from "@/lib/credits/types";

type CreditRequirementProps = {
  creditType: CreditType;
  required: number;
  balance: number;
  actionLabel: string;
  pendingLabel: string;
  onAction: () => void;
  isActionPending?: boolean;
  /** "card" (default): the existing white-card presentation, used
   * inside a white `.card` (Resume's review card). "hero": same copy
   * and behavior, white-on-blue presentation for use inside a
   * PageHero's action slot (LinkedIn Centre) -- avoids a plain
   * `.btn-primary` (mid-blue) rendering almost invisibly on the hero's
   * blue background. */
  variant?: "card" | "hero";
};

/** Presentational only: shown at the point of action (Resume/LinkedIn
 * review requests) so the credit cost and current balance are visible
 * right next to the button that spends them. The backend remains the
 * only authority on balance validation/deduction -- this never decides
 * anything, it just renders what the caller already knows. */
export function CreditRequirement({
  creditType,
  required,
  balance,
  actionLabel,
  pendingLabel,
  onAction,
  isActionPending,
  variant = "card",
}: CreditRequirementProps) {
  const label = CREDIT_LABELS[creditType];
  const unit = required === 1 ? "credit" : "credits";
  const hasEnough = balance >= required;
  const isHero = variant === "hero";

  if (!hasEnough) {
    return (
      <section
        className={isHero ? undefined : "card card-dashed"}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          ...(isHero
            ? {
                background: "rgba(255, 255, 255, 0.12)",
                border: "1px solid rgba(255, 255, 255, 0.18)",
                borderRadius: "var(--radius-md)",
                padding: "1rem 1.25rem",
              }
            : {}),
        }}
      >
        <p style={{ fontWeight: 600, color: isHero ? "#fff" : undefined }}>
          You need {required} {label} {unit} to request a review.
        </p>
        <p style={{ color: isHero ? "rgba(255, 255, 255, 0.85)" : "var(--color-text-secondary)", fontSize: "0.875rem" }}>
          Your balance: {balance}
        </p>
        <Link href="/app/credits" className={isHero ? "btn-primary hero-cta" : "btn-primary"} style={{ alignSelf: "flex-start" }}>
          View Credits
        </Link>
      </section>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <p style={{ color: isHero ? "rgba(255, 255, 255, 0.85)" : "var(--color-text-secondary)", fontSize: "0.875rem" }}>
        {required} {label} {unit} required · You have {balance}
      </p>
      <button
        type="button"
        className={isHero ? "btn-primary hero-cta" : "btn-primary"}
        onClick={onAction}
        disabled={isActionPending}
        style={{ alignSelf: "flex-start" }}
      >
        {isActionPending ? pendingLabel : actionLabel}
      </button>
    </div>
  );
}
