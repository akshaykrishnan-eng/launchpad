type StatusBadgeProps = {
  label: string;
  isPositive: boolean;
};

export function StatusBadge({ label, isPositive }: StatusBadgeProps) {
  return (
    <span
      data-state={isPositive ? "positive" : "negative"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.25rem 0.75rem",
        borderRadius: "999px",
        fontSize: "0.875rem",
        fontWeight: 600,
        backgroundColor: isPositive ? "#d1fae5" : "#fee2e2",
        color: isPositive ? "#065f46" : "#991b1b",
      }}
    >
      <span
        style={{
          width: "0.5rem",
          height: "0.5rem",
          borderRadius: "999px",
          backgroundColor: isPositive ? "#10b981" : "#ef4444",
        }}
      />
      {label}
    </span>
  );
}
