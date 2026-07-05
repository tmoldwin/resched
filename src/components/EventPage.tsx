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
  const [shareUrl, setShareUrl] = useState("");

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
    setShareUrl(window.location.href);
  }, []);

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
      <div className="mx-auto flex min-h-[40vh] max-w-5xl items-center justify-center px-4">
        <p className="text-sm text-zinc-500">Loading...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Event not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {error || "This link may be invalid."}
        </p>
      </div>
    );
  }

  if (event.locked && !unlocked) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <div className="rounded-lg border border-zinc-200 p-5">
          <h1 className="text-xl font-semibold">{event.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">Password required</p>
          <div className="mt-4 space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(inputEvent) => setPasswordInput(inputEvent.target.value)}
              placeholder="Password"
              className="w-full rounded-md border border-zinc-200 px-3 py-2.5 outline-none ring-zinc-900/10 focus:border-zinc-400 focus:ring-2"
            />
            {unlockError ? (
              <p className="text-sm text-red-600">{unlockError}</p>
            ) : null}
            <button
              type="button"
              onClick={unlockEvent}
              className="w-full rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:py-8">
      <section className="space-y-4 border-b border-zinc-200 pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {event.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {event.startDate} to {event.endDate} · {event.timezone}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-800" htmlFor="share-link">
            Share link
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="share-link"
              readOnly
              value={shareUrl}
              className="min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 outline-none"
            />
            <button
              type="button"
              onClick={copyLink}
              className="shrink-0 rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 transition hover:bg-zinc-50"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-zinc-800" htmlFor="participant-name">
              Your name
            </label>
            <input
              id="participant-name"
              value={name}
              onChange={(inputEvent) => setName(inputEvent.target.value)}
              placeholder="Add your name"
              className="w-full rounded-md border border-zinc-200 px-3 py-2.5 outline-none ring-zinc-900/10 focus:border-zinc-400 focus:ring-2"
            />
          </div>
          <p className="text-sm text-zinc-500">
            {event.participants.length} response
            {event.participants.length === 1 ? "" : "s"}
          </p>
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
