"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { grantCredit } from "@/lib/admin/client";
import type { CreditType } from "@/lib/mock-interviews/types";

const CREDIT_TYPES: { value: CreditType; label: string }[] = [
  { value: "MOCK_INTERVIEW", label: "Mock Interview" },
  { value: "CAREER_COACHING", label: "Career Coaching" },
  { value: "RESUME_REVIEW", label: "Resume Review" },
  { value: "LINKEDIN_REVIEW", label: "LinkedIn Review" },
];

const REASONS = [
  { value: "PROMOTIONAL_GRANT", label: "Promotional grant" },
  { value: "PACKAGE_PURCHASE", label: "Package purchase" },
  { value: "ADMIN_ADJUSTMENT", label: "Admin adjustment" },
  { value: "BOOKING_REFUND", label: "Booking refund" },
];

type GrantCreditFormProps = {
  initialCandidateId?: string;
  initialCandidateLabel?: string;
};

export function GrantCreditForm({ initialCandidateId, initialCandidateLabel }: GrantCreditFormProps) {
  const router = useRouter();
  const [candidateId, setCandidateId] = useState(initialCandidateId ?? "");
  const [creditType, setCreditType] = useState<CreditType>("MOCK_INTERVIEW");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("PROMOTIONAL_GRANT");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!candidateId.trim()) {
      setError("Please enter a candidate ID. Open the candidate from the Candidates list to copy it.");
      return;
    }
    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive whole number.");
      return;
    }

    setIsSubmitting(true);
    const result = await grantCredit({
      candidate_id: candidateId.trim(),
      credit_type: creditType,
      amount: parsedAmount,
      reason,
      description: description.trim() || null,
    });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setDescription("");
    router.refresh();
  }

  return (
    // noValidate: otherwise the browser's own min/max tooltip silently
    // blocks the submit event before handleSubmit runs, pre-empting our
    // styled validation message below.
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: "1.125rem", maxWidth: "480px" }}
    >
      {initialCandidateLabel && (
        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          Granting credits to <strong style={{ color: "var(--color-text-primary)" }}>{initialCandidateLabel}</strong>
        </p>
      )}

      <label htmlFor="grant-candidate-id">
        Candidate ID
        <input
          id="grant-candidate-id"
          type="text"
          value={candidateId}
          onChange={(e) => setCandidateId(e.target.value)}
          placeholder="Copy from the candidate's profile URL"
        />
      </label>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <label htmlFor="grant-credit-type" style={{ flex: "1 1 200px" }}>
          Credit type
          <select id="grant-credit-type" value={creditType} onChange={(e) => setCreditType(e.target.value as CreditType)}>
            {CREDIT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </label>

        <label htmlFor="grant-amount" style={{ flex: "1 1 100px" }}>
          Amount
          <input
            id="grant-amount"
            type="number"
            min={1}
            max={1000}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
      </div>

      <label htmlFor="grant-reason">
        Reason
        <select id="grant-reason" value={reason} onChange={(e) => setReason(e.target.value)}>
          {REASONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <label htmlFor="grant-description">
        Description (optional)
        <input
          id="grant-description"
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Compensation for a delayed review"
        />
      </label>

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}
      {success && !error && (
        <p role="status" style={{ color: "var(--color-success-text)", fontSize: "0.875rem" }}>
          Credit granted.
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ alignSelf: "flex-start" }}>
        {isSubmitting ? "Granting..." : "Grant Credit"}
      </button>
    </form>
  );
}
