export function EmptyResumeState() {
  return (
    <section style={{ border: "1px dashed #d1d5db", borderRadius: "0.75rem", padding: "2rem", textAlign: "center" }}>
      <p style={{ fontWeight: 600 }}>No resume uploaded yet</p>
      <p style={{ opacity: 0.75 }}>Upload a PDF, DOC, or DOCX to get started.</p>
    </section>
  );
}
