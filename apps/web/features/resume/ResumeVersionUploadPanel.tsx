"use client";

import { forwardRef, useRef, useState } from "react";

import { UploadIcon } from "@/components/icons";
import { uploadResume } from "@/lib/resume/client";

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

type ResumeVersionUploadPanelProps = {
  onUploaded: () => void;
  onCancel: () => void;
};

export const ResumeVersionUploadPanel = forwardRef<HTMLDivElement, ResumeVersionUploadPanelProps>(
  function ResumeVersionUploadPanel({ onUploaded, onCancel }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function trySelectFile(file: File | undefined) {
      if (!file) return;
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setError("Please upload a PDF, DOC, or DOCX file.");
        setSelectedFile(null);
        return;
      }
      setError(null);
      setSelectedFile(file);
    }

    function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
      trySelectFile(event.target.files?.[0]);
      event.target.value = "";
    }

    function handleDrop(event: React.DragEvent<HTMLDivElement>) {
      event.preventDefault();
      setIsDragOver(false);
      if (isUploading) return;
      trySelectFile(event.dataTransfer.files?.[0]);
    }

    async function handleUpload() {
      if (!selectedFile || isUploading) return;
      setIsUploading(true);
      setError(null);
      const result = await uploadResume(selectedFile);
      setIsUploading(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onUploaded();
    }

    function handleCancel() {
      setSelectedFile(null);
      setError(null);
      onCancel();
    }

    return (
      <div
        ref={ref}
        className="card upload-version-panel"
        style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        <div>
          {/* tabIndex={-1} lets ResumeCentre focus the heading on reveal for accessible context */}
          <h2 tabIndex={-1} style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 0.25rem" }}>
            Upload a new resume version
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", margin: 0 }}>
            PDF, DOC, or DOCX · up to 5 MB
          </p>
        </div>

        <div
          className="upload-dropzone"
          data-dragover={isDragOver}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <UploadIcon aria-hidden className="upload-dropzone-icon" />
          <label
            htmlFor="resume-version-upload-input"
            style={{ fontWeight: 600, marginBottom: 0, cursor: "pointer" }}
          >
            Choose file
          </label>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.8125rem" }}>
            or drag and drop
          </p>
          <input
            id="resume-version-upload-input"
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileChange}
            disabled={isUploading}
            aria-describedby={error ? "resume-version-upload-error" : undefined}
          />
        </div>

        {selectedFile && (
          <p
            style={{ fontSize: "0.875rem", fontWeight: 500, margin: 0 }}
            aria-live="polite"
          >
            Selected: {selectedFile.name}
          </p>
        )}

        {error && (
          <p
            id="resume-version-upload-error"
            role="alert"
            style={{ color: "var(--color-danger)", fontSize: "0.875rem", margin: 0 }}
          >
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button
            type="button"
            className="btn-primary btn-sm"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload version"}
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  },
);
