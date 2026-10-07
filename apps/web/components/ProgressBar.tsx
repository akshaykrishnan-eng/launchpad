type ProgressBarProps = {
  percentage: number;
  label: string;
};

/** The continuous percentage bar shared by ProfileCompletionCard and the
 * onboarding overview page -- previously two copies of the same track/fill
 * markup. */
export function ProgressBar({ percentage, label }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="progress-track"
    >
      <div className="progress-fill" style={{ width: `${clamped}%` }} />
    </div>
  );
}
