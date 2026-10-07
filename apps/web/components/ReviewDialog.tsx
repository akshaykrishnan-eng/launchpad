"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

import { CloseIcon } from "@/components/icons";
import { ReviewFeedback, type ReviewFeedbackResult } from "@/components/ReviewFeedback";

type ReviewStatus = "REQUESTED" | "IN_REVIEW" | "COMPLETED";

type ReviewDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  kind: "resume" | "linkedin";
  /** Filename+version for a resume, the profile URL for LinkedIn --
   * domain-specific, so the caller supplies it rather than the dialog
   * guessing at a shape. */
  documentLabel: ReactNode;
  status: ReviewStatus | null;
  result: ReviewFeedbackResult | null;
};

const TITLES: Record<ReviewDialogProps["kind"], string> = {
  resume: "Resume Review",
  linkedin: "LinkedIn Review",
};

/** One review-presentation surface shared by Resume and LinkedIn, in
 * place of the inline "View Feedback" expansion that used to push the
 * whole page (version history included) far down the screen. Built on
 * the native <dialog> element so focus trapping, Escape-to-close, and
 * the backdrop come from the browser instead of a hand-rolled
 * implementation. */
export function ReviewDialog({ isOpen, onClose, kind, documentLabel, status, result }: ReviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      // jsdom (unit tests) doesn't implement showModal/close -- fall
      // back to the plain `open` attribute so the dialog's content
      // still renders for tests, while real browsers get the full
      // native modal (focus trap, Escape, ::backdrop).
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

  // Syncs state back when the dialog closes itself (Escape, or a form
  // with method="dialog") rather than through our own close button.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  // Belt-and-suspenders: modal <dialog> shouldn't let the page behind
  // it scroll, but not every browser enforces that, so pin it directly.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <dialog
      ref={dialogRef}
      className="review-dialog"
      aria-labelledby={titleId}
      onClick={(event) => {
        // Clicking the ::backdrop still targets the <dialog> element
        // itself, never a descendant -- the standard way to detect an
        // "outside click" on a native dialog.
        if (event.target === dialogRef.current) onClose();
      }}
    >
      {isOpen && (
        <div className="review-dialog-content">
          <div className="review-dialog-header">
            <div>
              <h2 id={titleId} style={{ fontSize: "1.0625rem" }}>
                {TITLES[kind]}
              </h2>
              <div style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginTop: "0.125rem" }}>
                {documentLabel}
              </div>
            </div>
            <button type="button" className="review-dialog-close" onClick={onClose} aria-label="Close review">
              <CloseIcon aria-hidden />
            </button>
          </div>

          <div className="review-dialog-body">
            {status === "COMPLETED" && result ? (
              <ReviewFeedback result={result} ariaLabel={`${TITLES[kind]} feedback`} />
            ) : status === "COMPLETED" ? (
              // Shouldn't normally happen (COMPLETED implies a result),
              // but never claim a review is done without one.
              <p style={{ color: "var(--color-text-secondary)" }}>No review completed yet.</p>
            ) : (
              <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
                <p style={{ fontWeight: 600 }}>Review in progress</p>
                <p style={{ color: "var(--color-text-secondary)", marginTop: "0.375rem" }}>
                  Your review is being prepared. We&apos;ll show your feedback here when it&apos;s ready.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
