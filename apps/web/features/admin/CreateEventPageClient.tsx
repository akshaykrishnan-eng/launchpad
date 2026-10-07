"use client";

import { useRouter } from "next/navigation";

import { EventForm } from "@/features/admin/EventForm";
import { createEvent } from "@/lib/admin/client";

export function CreateEventPageClient() {
  const router = useRouter();

  return (
    <section className="card">
      <EventForm
        submitLabel="Create event"
        onSubmit={async (payload) => {
          const result = await createEvent(payload);
          if (result.ok) {
            router.push(`/admin/events/${result.data.id}`);
            return { ok: true };
          }
          return { ok: false, error: result.error };
        }}
      />
    </section>
  );
}
