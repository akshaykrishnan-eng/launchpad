import type { InterviewFeedback } from "@/lib/mock-interviews/types";

const CRITERIA: { key: keyof InterviewFeedback; label: string }[] = [
  { key: "communication_score", label: "Communication" },
  { key: "confidence_score", label: "Confidence" },
  { key: "technical_score", label: "Technical Knowledge" },
  { key: "answer_structure_score", label: "Answer Structure" },
  { key: "professional_presentation_score", label: "Professional Presentation" },
];

export function InterviewFeedbackView({ feedback }: { feedback: InterviewFeedback }) {
  const score = feedback.overall_score;

  return (
    <article aria-label="Mock interview feedback" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Overall score summary */}
      <div className="if-score-summary">
        <div
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Overall score: ${score} out of 100`}
          className="if-score-ring"
          style={{ "--ring-pct": score } as React.CSSProperties}
        >
          <div className="if-score-ring-fill" aria-hidden="true" />
          <div className="if-score-ring-hole" aria-hidden="true">
            <span className="if-score-ring-value">{score}</span>
            <span className="if-score-ring-max">/ 100</span>
          </div>
        </div>
        <p className="if-score-summary-label">Overall Score</p>
      </div>

      {/* Evaluation criteria */}
      <section>
        <h3 style={{ fontSize: "0.9375rem", marginBottom: "0.625rem" }}>Evaluation Criteria</h3>
        <div role="list" aria-label="Scores by area" className="if-criteria-grid">
          {CRITERIA.map(({ key, label }) => {
            const val = feedback[key] as number;
            return (
              <div key={key} role="listitem" className="if-criterion-card">
                <p className="if-criterion-label">{label}</p>
                <p className="if-criterion-score">
                  {val}
                  <span className="if-criterion-score-unit"> / 10</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feedback text */}
      {feedback.feedback && (
        <section>
          <h3 style={{ fontSize: "0.9375rem", marginBottom: "0.5rem" }}>Feedback</h3>
          <div className="if-feedback-block">
            <p style={{ lineHeight: 1.6 }}>{feedback.feedback}</p>
          </div>
        </section>
      )}

      {/* Recommendations */}
      {feedback.recommendations.length > 0 && (
        <section>
          <h3 style={{ fontSize: "0.9375rem", marginBottom: "0.375rem" }}>Recommendations</h3>
          <ul className="feedback-list">
            {feedback.recommendations.map((item) => (
              <li key={item}>
                <span className="feedback-marker feedback-marker-info" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
