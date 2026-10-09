"use client";

import { useEffect, useId, useRef } from "react";

import { CloseIcon } from "@/components/icons";
import { InterviewFeedbackView } from "@/features/mock-interviews/InterviewFeedbackView";
import { MockInterviewStatusBadge } from "@/features/mock-interviews/MockInterviewStatusBadge";
import { formatDateTime, interviewTitle } from "@/lib/mock-interviews/labels";
import type { MockInterview } from "@/lib/mock-interviews/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  interview: MockInterview | null;
};

export function InterviewFeedbackDialog({ isOpen, onClose, interview }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === "function") {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    }
  }, [isOpen]);

  // Sync state back when the dialog closes itself (Escape or form method="dialog").
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Pin body scroll while open.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="review-dialog interview-feedback-dialog"
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      {isOpen && interview && (
        <div className="review-dialog-content">
          <div className="review-dialog-header">
            <div>
              <h2 id={titleId} style={{ fontSize: "1.0625rem" }}>
                {interviewTitle(interview)} Feedback
              </h2>
              <div
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: "0.875rem",
                  marginTop: "0.125rem",
                  display: "flex",
                  gap: "0.625rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span>{formatDateTime(interview.scheduled_at)}</span>
                <MockInterviewStatusBadge status={interview.status} />
              </div>
            </div>
            <button
              type="button"
              className="review-dialog-close"
              onClick={onClose}
              aria-label="Close feedback"
            >
              <CloseIcon aria-hidden />
            </button>
          </div>

          <div className="review-dialog-body">
            {interview.feedback ? (
              <InterviewFeedbackView feedback={interview.feedback} />
            ) : (
              <p style={{ color: "var(--color-text-secondary)" }}>No feedback available yet.</p>
            )}
          </div>

          <div className="review-dialog-footer">
            <button type="button" className="btn btn-primary btn-sm" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
