"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserEventsResponse, UserEventSummary } from "@/lib/types";

function EventRow({
  event,
  onClone,
  cloningSlug,
}: {
  event: UserEventSummary;
  onClone: (slug: string) => void;
  cloningSlug: string | null;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href={`/e/${event.slug}`}
          className="font-medium text-zinc-900 transition hover:text-zinc-700"
        >
          {event.name}
        </Link>
        <p className="mt-1 text-sm text-zinc-500">
          {event.startDate} to {event.endDate} · {event.participantCount} response
          {event.participantCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Link href={`/e/${event.slug}`} className="btn-secondary">
          Open
        </Link>
        <button
          type="button"
          onClick={() => onClone(event.slug)}
          disabled={cloningSlug === event.slug}
          className="btn-secondary"
        >
          {cloningSlug === event.slug ? "Cloning…" : "Clone"}
        </button>
      </div>
    </div>
  );
}

function EventSection({
  title,
  events,
  emptyMessage,
  onClone,
  cloningSlug,
}: {
  title: string;
  events: UserEventSummary[];
  emptyMessage: string;
  onClone: (slug: string) => void;
  cloningSlug: string | null;
}) {
  if (events.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {title}
        </h2>
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        {title}
      </h2>
      <div className="space-y-3">
        {events.map((event) => (
          <EventRow
            key={`${event.role}-${event.id}`}
            event={event}
            onClone={onClone}
            cloningSlug={cloningSlug}
          />
        ))}
      </div>
    </section>
  );
}

export default function EventsDashboard() {
  const router = useRouter();
  const [data, setData] = useState<UserEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cloningSlug, setCloningSlug] = useState<string | null>(null);

  useEffect(() => {
    async function loadEvents() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/me/events", { cache: "no-store" });
        const payload = (await response.json()) as UserEventsResponse & {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error || "Could not load events.");
        }

        setData(payload);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Could not load events.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadEvents();
  }, []);

  async function cloneEvent(slug: string) {
    setCloningSlug(slug);
    setError("");

    try {
      const response = await fetch(`/api/events/${slug}/clone`, { method: "POST" });
      const payload = (await response.json()) as { slug?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not clone event.");
      }

      router.push(`/e/${payload.slug}`);
    } catch (cloneError) {
      setError(
        cloneError instanceof Error ? cloneError.message : "Could not clone event.",
      );
      setCloningSlug(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading your events…</p>;
  }

  return (
    <div className="space-y-8">
      {error ? <p className="notice-error">{error}</p> : null}

      <EventSection
        title="Created by you"
        events={data?.created ?? []}
        emptyMessage="You haven't created any events yet."
        onClone={cloneEvent}
        cloningSlug={cloningSlug}
      />

      <EventSection
        title="Attending"
        events={data?.attending ?? []}
        emptyMessage="You haven't joined any events yet."
        onClone={cloneEvent}
        cloningSlug={cloningSlug}
      />
    </div>
  );
}
