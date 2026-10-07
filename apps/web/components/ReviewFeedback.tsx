import { ProgressRing } from "@/components/ProgressRing";

export type ReviewFeedbackResult = {
  score: number | null;
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
};

type ReviewFeedbackProps = {
  result: ReviewFeedbackResult;
  ariaLabel: string;
};

/** The score/summary/strengths/improvements/recommendations layout
 * shared by resume and LinkedIn review feedback -- previously two
 * byte-for-byte identical components (ReviewResultView /
 * LinkedInReviewResult), one per vertical. */
export function ReviewFeedback({ result, ariaLabel }: ReviewFeedbackProps) {
  return (
    <article aria-label={ariaLabel} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {result.score !== null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.125rem",
            paddingBottom: "1.25rem",
            borderBottom: "1px solid var(--color-border-subtle)",
          }}
        >
          <ProgressRing percentage={result.score} label="Score" size={76} />
          <div>
            <p style={{ fontSize: "1.625rem", fontWeight: 700, lineHeight: 1.1 }}>
              <span>{result.score}</span>
              <span style={{ fontSize: "1rem", fontWeight: 500, color: "var(--color-text-secondary)" }}> / 100</span>
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.1875rem" }}>
              Overall score
            </p>
          </div>
        </div>
      )}

      <section>
        <h3>Summary</h3>
        <p style={{ marginTop: "0.375rem" }}>{result.summary}</p>
      </section>

      {result.strengths.length > 0 && (
        <section>
          <h3>Strengths</h3>
          <ul className="feedback-list">
            {result.strengths.map((item) => (
              <li key={item}>
                <span className="feedback-marker feedback-marker-success" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.improvements.length > 0 && (
        <section>
          <h3>Areas for improvement</h3>
          <ul className="feedback-list">
            {result.improvements.map((item) => (
              <li key={item}>
                <span className="feedback-marker feedback-marker-warning" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.recommendations.length > 0 && (
        <section className="callout">
          <h3>Recommendations</h3>
          <ul className="feedback-list">
            {result.recommendations.map((item) => (
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
