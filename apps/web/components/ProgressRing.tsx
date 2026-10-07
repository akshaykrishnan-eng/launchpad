type ProgressRingProps = {
  percentage: number;
  label: string;
  size?: number;
  unit?: string;
};

/** Circular alternative to ProgressBar for headline numbers (dashboard
 * hero, profile header, resume score) -- see .progress-ring* in
 * globals.css. Always rendered on its own floating white badge so it
 * reads cleanly on any surface, including the primary-gradient hero. */
export function ProgressRing({ percentage, label, size = 72, unit }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div className="progress-ring-badge">
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="progress-ring"
        style={{ "--ring-size": `${size}px`, "--ring-pct": clamped } as React.CSSProperties}
      >
        <div className="progress-ring-fill" />
        <div className="progress-ring-hole">
          <span className="progress-ring-value">{clamped}%</span>
          {unit && <span className="progress-ring-unit">{unit}</span>}
        </div>
      </div>
    </div>
  );
}
