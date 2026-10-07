"use client";

import { useState } from "react";

import { bookInterview, getAvailableSlots } from "@/lib/mock-interviews/client";
import { INTERVIEW_TYPE_LABELS, formatDateTime } from "@/lib/mock-interviews/labels";
import type { InterviewSlot, InterviewType, MockInterview } from "@/lib/mock-interviews/types";

const INTERVIEW_TYPES = Object.keys(INTERVIEW_TYPE_LABELS) as InterviewType[];

type Step = "type" | "slot" | "confirm";

type BookingFlowProps = {
  onBooked: (interview: MockInterview) => void;
  onCancel: () => void;
};

export function BookingFlow({ onBooked, onCancel }: BookingFlowProps) {
  const [step, setStep] = useState<Step>("type");
  const [interviewType, setInterviewType] = useState<InterviewType | null>(null);
  const [role, setRole] = useState("");
  const [slots, setSlots] = useState<InterviewSlot[] | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<InterviewSlot | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function proceedToSlots(type: InterviewType) {
    setInterviewType(type);
    setError(null);
    setStep("slot");
    setIsLoadingSlots(true);
    const result = await getAvailableSlots(type);
    setIsLoadingSlots(false);
    if (result.ok) {
      setSlots(result.data);
    } else {
      setSlots([]);
      setError(result.error);
    }
  }

  async function handleConfirm() {
    if (!interviewType || !selectedSlot) return;
    setError(null);
    setIsBooking(true);
    const result = await bookInterview(selectedSlot.id, role.trim() || undefined);
    setIsBooking(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onBooked(result.data);
  }

  return (
    <section aria-labelledby="booking-flow-heading" className="card" style={{ display: "flex", flexDirection: "column", gap: "1.125rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 id="booking-flow-heading">Book a Mock Interview</h2>
        <button type="button" className="btn-ghost btn-sm" onClick={onCancel}>
          Cancel
        </button>
      </div>

      {step === "type" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
            1. Choose an interview type
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
            {INTERVIEW_TYPES.map((type) => {
              const isSelected = interviewType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    if (type === "ROLE_SPECIFIC") {
                      setInterviewType(type);
                    } else {
                      proceedToSlots(type);
                    }
                  }}
                  aria-pressed={isSelected}
                  style={
                    isSelected
                      ? { borderColor: "var(--color-primary)", background: "var(--color-primary-subtle)", color: "var(--color-primary)" }
                      : undefined
                  }
                >
                  {INTERVIEW_TYPE_LABELS[type]}
                </button>
              );
            })}
          </div>

          {interviewType === "ROLE_SPECIFIC" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", maxWidth: "400px" }}>
              <label htmlFor="booking-role-input">
                Which role would you like to practice for?
                <input
                  id="booking-role-input"
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  placeholder="e.g. Python Backend Engineer"
                />
              </label>
              <button
                type="button"
                className="btn-primary"
                onClick={() => proceedToSlots("ROLE_SPECIFIC")}
                disabled={!role.trim()}
                style={{ alignSelf: "flex-start", marginTop: "0.5rem" }}
              >
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {step === "slot" && interviewType && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
              2. Choose a time
            </p>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setStep("type")}>
              Back
            </button>
          </div>

          {isLoadingSlots && <p style={{ color: "var(--color-text-secondary)" }}>Loading available slots...</p>}
          {!isLoadingSlots && slots && slots.length === 0 && (
            <p style={{ color: "var(--color-text-secondary)" }}>No available slots for this interview type right now.</p>
          )}
          {!isLoadingSlots && slots && slots.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot);
                    setError(null);
                    setStep("confirm");
                  }}
                  style={{ textAlign: "left", justifyContent: "flex-start" }}
                >
                  {formatDateTime(slot.starts_at)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "confirm" && interviewType && selectedSlot && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
              3. Confirm your booking
            </p>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setStep("slot")}>
              Back
            </button>
          </div>

          <dl
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              background: "var(--color-surface-muted)",
              borderRadius: "var(--radius-md)",
              padding: "1rem",
            }}
          >
            <div>
              <dt style={{ display: "inline", fontWeight: 600 }}>Interview type: </dt>
              <dd style={{ display: "inline" }}>
                {interviewType === "ROLE_SPECIFIC" && role.trim()
                  ? `${role.trim()} Interview`
                  : INTERVIEW_TYPE_LABELS[interviewType]}
              </dd>
            </div>
            <div>
              <dt style={{ display: "inline", fontWeight: 600 }}>Date &amp; time: </dt>
              <dd style={{ display: "inline" }}>{formatDateTime(selectedSlot.starts_at)}</dd>
            </div>
            <div>
              <dt style={{ display: "inline", fontWeight: 600 }}>Credit cost: </dt>
              <dd style={{ display: "inline" }}>1 Mock Interview credit</dd>
            </div>
          </dl>

          {error && (
            <p role="alert" style={{ color: "var(--color-danger)", fontSize: "0.875rem" }}>
              {error}
            </p>
          )}

          <button type="button" className="btn-primary" onClick={handleConfirm} disabled={isBooking} style={{ alignSelf: "flex-start" }}>
            {isBooking ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      )}
    </section>
  );
}
