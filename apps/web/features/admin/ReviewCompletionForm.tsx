"use client";

import { useState } from "react";

import type { CompleteReviewPayload } from "@/lib/admin/types";

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

type ReviewCompletionFormProps = {
  onComplete: (payload: CompleteReviewPayload) => void;
  isSubmitting: boolean;
  error: string | null;
};

/** Shared by both the resume and LinkedIn review detail pages --
 * reviewer_type is never a field here: the backend always records
 * HUMAN for an admin-submitted review (PRD section 21). */
export function ReviewCompletionForm({ onComplete, isSubmitting, error }: ReviewCompletionFormProps) {
  const [score, setScore] = useState("");
  const [summary, setSummary] = useState("");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    if (!summary.trim()) {
      setValidationError("Please enter a summary.");
      return;
    }
    const parsedScore = score.trim() ? Number(score) : null;
    if (parsedScore !== null && (!Number.isInteger(parsedScore) || parsedScore < 0 || parsedScore > 100)) {
      setValidationError("Score must be a whole number between 0 and 100.");
      return;
    }

    onComplete({
      score: parsedScore,
      summary: summary.trim(),
      strengths: linesToList(strengths),
      improvements: linesToList(improvements),
      recommendations: linesToList(recommendations),
    });
  }

  return (
    // noValidate: otherwise the browser's own min/max tooltip silently
    // blocks the submit event before handleSubmit runs, pre-empting our
    // styled validation message below.
    <form
      onSubmit={handleSubmit}
      noValidate
      className="card"
      style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}
    >
      <h2>Complete Review</h2>

      <label htmlFor="review-score">
        Score (0–100, optional)
        <input
          id="review-score"
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          placeholder="e.g. 82"
        />
      </label>

      <label htmlFor="review-summary">
        Summary
        <textarea
          id="review-summary"
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Overall impression of the resume..."
        />
      </label>

      <label htmlFor="review-strengths">
        Strengths (one per line)
        <textarea
          id="review-strengths"
          rows={3}
          value={strengths}
          onChange={(e) => setStrengths(e.target.value)}
          placeholder={"Clear formatting\nQuantified achievements"}
        />
      </label>

      <label htmlFor="review-improvements">
        Areas for improvement (one per line)
        <textarea
          id="review-improvements"
          rows={3}
          value={improvements}
          onChange={(e) => setImprovements(e.target.value)}
          placeholder={"Add a professional summary\nTailor skills to target roles"}
        />
      </label>

      <label htmlFor="review-recommendations">
        Recommendations (one per line)
        <textarea
          id="review-recommendations"
          rows={3}
          value={recommendations}
          onChange={(e) => setRecommendations(e.target.value)}
        />
      </label>

      {(validationError || error) && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
          {validationError || error}
        </p>
      )}

      <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ alignSelf: "flex-start" }}>
        {isSubmitting ? "Submitting..." : "Complete Review"}
      </button>
    </form>
  );
}
