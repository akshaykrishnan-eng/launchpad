"use client";

import { useState } from "react";

import { saveLinkedInUrl } from "@/lib/linkedin/client";

type LinkedInUrlFormProps = {
  initialUrl?: string;
  onSaved: () => void;
  onCancel?: () => void;
};

export function LinkedInUrlForm({ initialUrl = "", onSaved, onCancel }: LinkedInUrlFormProps) {
  const [url, setUrl] = useState(initialUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!url.trim()) {
      setError("Please enter your LinkedIn profile URL.");
      return;
    }

    setError(null);
    setIsSaving(true);
    const result = await saveLinkedInUrl(url);
    setIsSaving(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxWidth: "440px" }}>
      <label htmlFor="linkedin-url-input">
        LinkedIn Profile URL
        <input
          id="linkedin-url-input"
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.linkedin.com/in/your-name"
          aria-invalid={error ? "true" : undefined}
        />
      </label>

      {error && (
        <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
          {error}
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save"}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={isSaving}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
