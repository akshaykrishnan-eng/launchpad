"use client";

import { useRef, useState } from "react";

import { uploadResume } from "@/lib/resume/client";
import type { Resume } from "@/lib/resume/types";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

type ResumeUploadProps = {
  onUploaded: (resume: Resume) => void;
};

export function ResumeUpload({ onUploaded }: ResumeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setError("Please upload a PDF, DOC, or DOCX file.");
      return;
    }

    setError(null);
    setIsUploading(true);
    const result = await uploadResume(file);
    setIsUploading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onUploaded(result.data);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <label htmlFor="resume-upload-input" style={{ fontWeight: 600 }}>
        Upload resume
      </label>
      <input
        id="resume-upload-input"
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={handleFileSelected}
        disabled={isUploading}
      />
      {isUploading && <p>Uploading...</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
