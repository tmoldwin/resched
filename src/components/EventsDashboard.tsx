"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { UserEventsResponse, UserEventSummary } from "@/lib/types";
import {
  claimLocallyCreatedEvents,
  unmarkLocallyCreated,
} from "@/lib/event-claims";

function CreatedEventRow({
  event,
  onDelete,
  deletingSlug,
}: {
  event: UserEventSummary;
  onDelete: (slug: string) => void;
  deletingSlug: string | null;
}) {
  const router = useRouter();

  return (
    <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          href={`/e/${event.slug}?view=responses`}
          className="font-medium text-zinc-900 transition hover:text-zinc-700"
        >
          {event.name}
        </Link>
        <p className="mt-1 text-sm text-zinc-500">
          {event.startDate} to {event.endDate} · {event.participantCount} response
          {event.participantCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="action-bar action-bar-3">
        <Link href={`/e/${event.slug}?view=responses`} className="btn-secondary">
          View responses
        </Link>
        <button
          type="button"
          onClick={() => router.push(`/new?clone=${event.slug}`)}
          className="btn-secondary"
        >
          Clone
        </button>
        <button
          type="button"
          onClick={() => onDelete(event.slug)}
          disabled={deletingSlug === event.slug}
          className="btn-danger"
        >
          {deletingSlug === event.slug ? "Deleting…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

function AttendingEventRow({ event }: { event: UserEventSummary }) {
  return (
    <div className="card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
      <div className="action-bar">
        <Link href={`/e/${event.slug}`} className="btn-secondary">
          Edit responses
        </Link>
        <Link href={`/e/${event.slug}?view=responses`} className="btn-secondary">
          View responses
        </Link>
      </div>
    </div>
  );
}

function EventSection({
  title,
  events,
  emptyMessage,
  variant,
  onDelete,
  deletingSlug,
}: {
  title: string;
  events: UserEventSummary[];
  emptyMessage: string;
  variant: "created" | "attending";
  onDelete?: (slug: string) => void;
  deletingSlug?: string | null;
}) {
  if (events.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="section-label">{title}</h2>
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="section-label">{title}</h2>
      <div className="space-y-3">
        {events.map((event) =>
          variant === "created" ? (
            <CreatedEventRow
              key={`${event.role}-${event.id}`}
              event={event}
              onDelete={onDelete!}
              deletingSlug={deletingSlug ?? null}
            />
          ) : (
            <AttendingEventRow key={`${event.role}-${event.id}`} event={event} />
          ),
        )}
      </div>
    </section>
  );
}

export default function EventsDashboard() {
  const [data, setData] = useState<UserEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await claimLocallyCreatedEvents();

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
  }, []);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  async function deleteEvent(slug: string) {
    const event = data?.created.find((item) => item.slug === slug);
    if (!event) return;

    const confirmed = window.confirm(
      `Delete "${event.name}"? This removes all responses and cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingSlug(slug);
    setError("");

    try {
      const response = await fetch(`/api/events/${slug}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Could not delete event.");
      }

      unmarkLocallyCreated(slug);
      await loadEvents();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Could not delete event.",
      );
    } finally {
      setDeletingSlug(null);
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
        variant="created"
        onDelete={deleteEvent}
        deletingSlug={deletingSlug}
      />

      <EventSection
        title="Attending"
        events={data?.attending ?? []}
        emptyMessage="You haven't joined any events yet."
        variant="attending"
      />
    </div>
  );
}
