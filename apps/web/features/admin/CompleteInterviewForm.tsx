"use client";

import { useState } from "react";

import type { CompleteInterviewPayload } from "@/lib/admin/types";

const SCORE_FIELDS: { key: keyof Omit<CompleteInterviewPayload, "feedback" | "recommendations" | "overall_score">; label: string }[] = [
  { key: "communication_score", label: "Communication" },
  { key: "confidence_score", label: "Confidence" },
  { key: "technical_score", label: "Technical Knowledge" },
  { key: "answer_structure_score", label: "Answer Structure" },
  { key: "professional_presentation_score", label: "Professional Presentation" },
];

type CompleteInterviewFormProps = {
  onComplete: (payload: CompleteInterviewPayload) => void;
  isSubmitting: boolean;
  error: string | null;
};

export function CompleteInterviewForm({ onComplete, isSubmitting, error }: CompleteInterviewFormProps) {
  const [scores, setScores] = useState<Record<string, string>>({
    communication_score: "",
    confidence_score: "",
    technical_score: "",
    answer_structure_score: "",
    professional_presentation_score: "",
  });
  const [overallScore, setOverallScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);

    const parsedScores: Record<string, number> = {};
    for (const { key, label } of SCORE_FIELDS) {
      const value = Number(scores[key]);
      if (!scores[key] || !Number.isInteger(value) || value < 0 || value > 10) {
        setValidationError(`${label} must be a whole number between 0 and 10.`);
        return;
      }
      parsedScores[key] = value;
    }
    const overall = Number(overallScore);
    if (!overallScore || !Number.isInteger(overall) || overall < 0 || overall > 100) {
      setValidationError("Overall score must be a whole number between 0 and 100.");
      return;
    }
    if (!feedback.trim()) {
      setValidationError("Please enter feedback.");
      return;
    }

    onComplete({
      communication_score: parsedScores.communication_score,
      confidence_score: parsedScores.confidence_score,
      technical_score: parsedScores.technical_score,
      answer_structure_score: parsedScores.answer_structure_score,
      professional_presentation_score: parsedScores.professional_presentation_score,
      overall_score: overall,
      feedback: feedback.trim(),
      recommendations: recommendations
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
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
      <h2>Interview Feedback</h2>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
        {SCORE_FIELDS.map(({ key, label }) => (
          <label key={key} htmlFor={`score-${key}`}>
            {label} (0–10)
            <input
              id={`score-${key}`}
              type="number"
              min={0}
              max={10}
              value={scores[key]}
              onChange={(e) => setScores((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>

      <label htmlFor="overall-score">
        Overall score (0–100)
        <input
          id="overall-score"
          type="number"
          min={0}
          max={100}
          value={overallScore}
          onChange={(e) => setOverallScore(e.target.value)}
        />
      </label>

      <label htmlFor="interview-feedback">
        Feedback
        <textarea
          id="interview-feedback"
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="How the candidate performed..."
        />
      </label>

      <label htmlFor="interview-recommendations">
        Recommendations (one per line)
        <textarea
          id="interview-recommendations"
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
        {isSubmitting ? "Submitting..." : "Complete Interview"}
      </button>
    </form>
  );
}
