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
  deleteLabel = "Delete",
}: {
  event: UserEventSummary;
  onDelete: (slug: string) => void;
  deletingSlug: string | null;
  deleteLabel?: string;
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
          {deletingSlug === event.slug ? "Deleting…" : deleteLabel}
        </button>
      </div>
    </div>
  );
}

function AttendingEventRow({
  event,
  onDelete,
  deletingSlug,
}: {
  event: UserEventSummary;
  onDelete: (slug: string) => void;
  deletingSlug: string | null;
}) {
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

function EventSection({
  title,
  events,
  emptyMessage,
  variant,
  onDelete,
  deletingSlug,
  deleteLabel,
  hideTitle = false,
}: {
  title: string;
  events: UserEventSummary[];
  emptyMessage: string;
  variant: "created" | "attending" | "archived";
  onDelete?: (slug: string) => void;
  deletingSlug?: string | null;
  deleteLabel?: string;
  hideTitle?: boolean;
}) {
  if (events.length === 0) {
    return (
      <section className="space-y-3">
        {hideTitle ? null : <h2 className="section-label">{title}</h2>}
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {hideTitle ? null : <h2 className="section-label">{title}</h2>}
      <div className="space-y-3">
        {events.map((event) =>
          variant === "created" || variant === "archived" ? (
            <CreatedEventRow
              key={`${event.role}-${event.id}`}
              event={event}
              onDelete={onDelete!}
              deletingSlug={deletingSlug ?? null}
              deleteLabel={deleteLabel}
            />
          ) : (
            <AttendingEventRow
              key={`${event.role}-${event.id}`}
              event={event}
              onDelete={onDelete!}
              deletingSlug={deletingSlug ?? null}
            />
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
  const [archiveOpen, setArchiveOpen] = useState(false);

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
    const createdEvent =
      data?.createdUpcoming.find((item) => item.slug === slug) ??
      data?.createdArchived.find((item) => item.slug === slug);
    const attendingEvent = data?.attending.find((item) => item.slug === slug);
    const event = createdEvent ?? attendingEvent;
    if (!event) return;

    const confirmed = window.confirm(
      event.role === "creator"
        ? `Delete "${event.name}"? This removes the entire event and all responses.`
        : `Delete "${event.name}" from your events? Your saved responses will be erased, but the event will stay for everyone else.`,
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

      if (createdEvent) {
        unmarkLocallyCreated(slug);
      }
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
        events={data?.createdUpcoming ?? []}
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
        onDelete={deleteEvent}
        deletingSlug={deletingSlug}
      />

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setArchiveOpen((open) => !open)}
          className="flex w-full items-center justify-between text-left"
          aria-expanded={archiveOpen}
        >
          <span className="section-label">Archive</span>
          <span
            className={`text-sm text-zinc-500 transition-transform ${
              archiveOpen ? "rotate-180" : ""
            }`}
            aria-hidden
          >
            v
          </span>
        </button>

        {archiveOpen ? (
          <EventSection
            title="Archive"
            events={data?.createdArchived ?? []}
            emptyMessage="Past events you created will appear here for cloning."
            variant="archived"
            onDelete={deleteEvent}
            deletingSlug={deletingSlug}
            deleteLabel="Delete forever"
            hideTitle
          />
        ) : null}
      </section>
    </div>
  );
}
