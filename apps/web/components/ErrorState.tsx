type ErrorStateProps = {
  message: string;
  onRetry: () => void;
};

/** The shared error-state pattern: readable message, no internal
 * details ever, a retry action. Used by every *Centre and the
 * dashboard (see features/dashboard/DashboardErrorState.tsx for the
 * one caller that needs its own client wrapper around this). */
export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="card"
      style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      <p>{message}</p>
      <button type="button" onClick={onRetry} style={{ alignSelf: "center" }}>
        Retry
      </button>
    </div>
  );
}
