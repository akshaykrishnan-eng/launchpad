import type { WorkExperience } from "@/lib/candidate/types";

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function formatRange(entry: WorkExperience): string {
  const start = formatMonthYear(entry.start_date);
  if (entry.is_current) return `${start} — Present`;
  return entry.end_date ? `${start} — ${formatMonthYear(entry.end_date)}` : start;
}

type ExperienceTimelineProps = {
  experience: WorkExperience[];
  onEdit: (entry: WorkExperience) => void;
  editable: boolean;
};

/** A candidate's work history as a connected timeline (marker + role +
 * company + date range) instead of a "title at company" sentence or a
 * stack of bordered cards -- each entry's own permanent record, with
 * editing kept to a single secondary action per row. */
export function ExperienceTimeline({ experience, onEdit, editable }: ExperienceTimelineProps) {
  return (
    <ol className="experience-list">
      {experience.map((entry) => (
        <li key={entry.id} className="experience-item" data-current={entry.is_current}>
          <p className="experience-item-title">{entry.job_title}</p>
          <p className="experience-item-company">{entry.company}</p>
          <p className="experience-item-dates">{formatRange(entry)}</p>
          {editable && (
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => onEdit(entry)}
              style={{ marginTop: "0.5rem" }}
            >
              Edit
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}
