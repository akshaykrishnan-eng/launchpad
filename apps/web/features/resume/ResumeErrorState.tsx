export function ResumeErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" style={{ padding: "2rem", textAlign: "center", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p>We couldn&apos;t load your Resume Centre right now.</p>
      <button type="button" onClick={onRetry} style={{ alignSelf: "center" }}>
        Retry
      </button>
    </div>
  );
}
