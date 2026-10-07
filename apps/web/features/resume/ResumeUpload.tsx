"use client";

import { useRef, useState } from "react";

import { UploadIcon } from "@/components/icons";
import { uploadResume } from "@/lib/resume/client";
import type { Resume } from "@/lib/resume/types";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

type ResumeUploadProps = {
  onUploaded: (resume: Resume) => void;
};

export function ResumeUpload({ onUploaded }: ResumeUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
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

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    await handleFile(file);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    await handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <div
        className="upload-dropzone"
        data-dragover={isDragOver}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <UploadIcon aria-hidden className="upload-dropzone-icon" />
        <label htmlFor="resume-upload-input" style={{ fontWeight: 600, marginBottom: 0, cursor: "pointer" }}>
          Upload resume
        </label>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>
          Click to browse or drag and drop -- PDF, DOC, or DOCX, up to 5 MB.
        </p>
        <input
          id="resume-upload-input"
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileSelected}
          disabled={isUploading}
          aria-describedby={error ? "resume-upload-error" : undefined}
        />
      </div>

      <p role="status" style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem", minHeight: "1.125rem" }}>
        {isUploading ? "Uploading..." : "One file at a time -- uploading again adds a new version."}
      </p>

      {error && (
        <p id="resume-upload-error" role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
          {error}
        </p>
      )}
    </div>
  );
}
