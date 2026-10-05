import { ResumeStatusBadge } from "@/features/resume/ResumeStatusBadge";
import { downloadUrl } from "@/lib/resume/client";
import type { Resume } from "@/lib/resume/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function ResumeHistory({ resumes }: { resumes: Resume[] }) {
  if (resumes.length <= 1) return null;

  return (
    <section aria-labelledby="resume-history-heading" style={{ border: "1px solid #e5e7eb", borderRadius: "0.75rem", padding: "1.5rem" }}>
      <h2 id="resume-history-heading" style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        Resume History
      </h2>

      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {resumes.map((resume) => (
          <li
            key={resume.id}
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "0.5rem",
              fontWeight: resume.is_latest ? 700 : 400,
            }}
          >
            <span>
              v{resume.version}
              {resume.is_latest && " (latest)"} &mdash; {resume.original_filename} &mdash;{" "}
              {formatDate(resume.uploaded_at)}
            </span>
            <span style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
              <ResumeStatusBadge status={resume.status} />
              <a href={downloadUrl(resume.id)} download={resume.original_filename}>
                Download
              </a>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
