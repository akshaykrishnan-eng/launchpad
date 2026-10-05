import type { LinkedInReviewResult as LinkedInReviewResultType } from "@/lib/linkedin/types";

export function LinkedInReviewResult({ result }: { result: LinkedInReviewResultType }) {
  return (
    <article aria-label="LinkedIn review feedback" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {result.score !== null && (
        <p>
          <strong>Score:</strong> {result.score}
        </p>
      )}

      <section>
        <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Summary</h3>
        <p>{result.summary}</p>
      </section>

      {result.strengths.length > 0 && (
        <section>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Strengths</h3>
          <ul>
            {result.strengths.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {result.improvements.length > 0 && (
        <section>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Areas to Improve</h3>
          <ul>
            {result.improvements.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}

      {result.recommendations.length > 0 && (
        <section>
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>Recommendations</h3>
          <ul>
            {result.recommendations.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
