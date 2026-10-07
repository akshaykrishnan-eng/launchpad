import { StatTile } from "@/components/StatTile";
import type { InterviewFeedback } from "@/lib/mock-interviews/types";

const SCORE_FIELDS: { key: keyof InterviewFeedback; label: string }[] = [
  { key: "communication_score", label: "Communication" },
  { key: "confidence_score", label: "Confidence" },
  { key: "technical_score", label: "Technical Knowledge" },
  { key: "answer_structure_score", label: "Answer Structure" },
  { key: "professional_presentation_score", label: "Professional Presentation" },
];

export function InterviewFeedbackView({ feedback }: { feedback: InterviewFeedback }) {
  return (
    <article aria-label="Mock interview feedback" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="stat-tile" style={{ alignSelf: "flex-start", minWidth: "7rem" }}>
        <p className="stat-tile-label">Overall Score</p>
        <p className="stat-tile-value" style={{ fontSize: "1.75rem" }}>
          {feedback.overall_score}
          <span className="stat-tile-value-unit"> / 100</span>
        </p>
      </div>

      <div
        role="list"
        aria-label="Scores by area"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {SCORE_FIELDS.map(({ key, label }) => (
          <StatTile key={key} label={label} value={feedback[key] as number} unit="/ 10" />
        ))}
      </div>

      <section>
        <h3>Feedback</h3>
        <p style={{ marginTop: "0.25rem" }}>{feedback.feedback}</p>
      </section>

      {feedback.recommendations.length > 0 && (
        <section>
          <h3>Recommendations</h3>
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
