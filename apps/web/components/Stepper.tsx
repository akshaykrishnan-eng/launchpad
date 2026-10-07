type StepperProps = {
  steps: readonly { label: string }[];
  currentIndex: number;
};

/** The segmented step indicator used by onboarding: which step you're
 * on, how many remain, and (above sm width) the actual step names, so
 * "where am I / how much is left" never depends on counting bars. */
export function Stepper({ steps, currentIndex }: StepperProps) {
  const total = steps.length;
  const remaining = total - currentIndex - 1;

  return (
    <div>
      <ol aria-label={`Step ${currentIndex + 1} of ${total}`} className="stepper-track">
        {steps.map((step, i) => (
          <li
            key={step.label}
            aria-hidden="true"
            data-state={i < currentIndex ? "complete" : i === currentIndex ? "current" : "upcoming"}
            className="stepper-segment"
          />
        ))}
      </ol>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: "0.75rem",
          marginTop: "0.625rem",
        }}
      >
        <p style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
          Step {currentIndex + 1} of {total}
          <span style={{ fontWeight: 400, color: "var(--color-text-secondary)" }}> · {steps[currentIndex].label}</span>
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
          {remaining > 0 ? `${remaining} step${remaining === 1 ? "" : "s"} left` : "Last step"}
        </p>
      </div>
    </div>
  );
}
