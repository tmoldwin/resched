"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import type { EventResponse, ParticipantResponse } from "@/lib/types";

type EventPageProps = {
  slug: string;
};

function storageKey(slug: string) {
  return `resched:${slug}:session`;
}

function unlockKey(slug: string) {
  return `resched:${slug}:unlocked`;
}

function passwordKey(slug: string) {
  return `resched:${slug}:password`;
}

type StoredSession = {
  editToken: string;
  participantId: string;
  name: string;
};

export default function EventPage({ slug }: EventPageProps) {
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [editToken, setEditToken] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadEvent = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/events/${slug}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as EventResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Event not found.");
      }

      setEvent(data);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load event.",
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey(slug));
    if (raw) {
      try {
        const session = JSON.parse(raw) as StoredSession;
        setEditToken(session.editToken);
        setParticipantId(session.participantId);
        setName(session.name);
      } catch {
        localStorage.removeItem(storageKey(slug));
      }
    }

    if (localStorage.getItem(unlockKey(slug)) === "1") {
      setUnlocked(true);
      setStoredPassword(sessionStorage.getItem(passwordKey(slug)));
    }
  }, [slug]);

  const activeParticipant = useMemo<ParticipantResponse | null>(() => {
    if (!event) return null;

    if (participantId) {
      const existing = event.participants.find(
        (participant) => participant.id === participantId,
      );
      if (existing) {
        return { ...existing, name: name || existing.name };
      }
    }

    return {
      id: "draft",
      name,
      slots: [],
      updatedAt: new Date().toISOString(),
    };
  }, [event, participantId, name]);

  function handleSaved(participant: ParticipantResponse & { editToken: string }) {
    const session: StoredSession = {
      editToken: participant.editToken,
      participantId: participant.id,
      name: participant.name,
    };
    localStorage.setItem(storageKey(slug), JSON.stringify(session));
    setEditToken(participant.editToken);
    setParticipantId(participant.id);
    setName(participant.name);
    void loadEvent();
  }

  async function unlockEvent() {
    setUnlockError("");

    try {
      const response = await fetch(`/api/events/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(data.error || "Invalid password.");
      }

      localStorage.setItem(unlockKey(slug), "1");
      sessionStorage.setItem(passwordKey(slug), passwordInput);
      setStoredPassword(passwordInput);
      setUnlocked(true);
    } catch (unlockFailure) {
      setUnlockError(
        unlockFailure instanceof Error
          ? unlockFailure.message
          : "Invalid password.",
      );
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-6xl items-center justify-center px-4 py-10">
        <div className="text-zinc-600">Loading event...</div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-zinc-900">Event not found</h1>
        <p className="mt-3 text-zinc-600">{error || "This link may be invalid."}</p>
      </div>
    );
  }

  if (event.locked && !unlocked) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">{event.name}</h1>
          <p className="mt-2 text-sm text-zinc-600">
            This event is password protected.
          </p>
          <div className="mt-6 space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(inputEvent) => setPasswordInput(inputEvent.target.value)}
              placeholder="Enter password"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none ring-emerald-500 focus:bg-white focus:ring-2"
            />
            {unlockError ? (
              <div className="text-sm text-red-600">{unlockError}</div>
            ) : null}
            <button
              type="button"
              onClick={unlockEvent}
              className="w-full rounded-2xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              Unlock event
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:py-10">
      <section className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-emerald-700">
              resched
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-zinc-900 sm:text-3xl">
              {event.name}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              {event.startDate} to {event.endDate} · {event.timezone}
            </p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="rounded-2xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium text-zinc-700" htmlFor="participant-name">
              Your name
            </label>
            <input
              id="participant-name"
              value={name}
              onChange={(inputEvent) => setName(inputEvent.target.value)}
              placeholder="Enter your name to respond"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 outline-none ring-emerald-500 focus:bg-white focus:ring-2"
            />
          </div>
          <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
            {event.participants.length} participant
            {event.participants.length === 1 ? "" : "s"}
          </div>
        </div>
      </section>

      <AvailabilityGrid
        event={event}
        activeParticipant={activeParticipant}
        editToken={editToken}
        password={event.locked ? storedPassword || passwordInput : null}
        onSaved={handleSaved}
      />
    </div>
  );
}
