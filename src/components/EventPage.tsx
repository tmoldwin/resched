"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import GoogleSignInButton from "@/components/GoogleSignInButton";
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
  const { data: session, status: sessionStatus } = useSession();
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

  const isGoogleUser = Boolean(session?.user?.id);
  const nameLocked = isGoogleUser;

  const loadEvent = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
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
      if (!silent) {
        setLoading(false);
      }
    }
  }, [slug]);

  useEffect(() => {
    void loadEvent();
  }, [loadEvent]);

  useEffect(() => {
    setShareUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (localStorage.getItem(unlockKey(slug)) === "1") {
      setUnlocked(true);
      setStoredPassword(sessionStorage.getItem(passwordKey(slug)));
    }
  }, [slug]);

  useEffect(() => {
    if (!event) return;

    if (event.myParticipant) {
      setEditToken(event.myParticipant.editToken);
      setParticipantId(event.myParticipant.id);
      setName(event.myParticipant.name);
      const sessionData: StoredSession = {
        editToken: event.myParticipant.editToken,
        participantId: event.myParticipant.id,
        name: event.myParticipant.name,
      };
      localStorage.setItem(storageKey(slug), JSON.stringify(sessionData));
      return;
    }

    if (isGoogleUser && session?.user?.name) {
      setName(session.user.name);
      return;
    }

    const raw = localStorage.getItem(storageKey(slug));
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredSession;
        setEditToken(stored.editToken);
        setParticipantId(stored.participantId);
        setName(stored.name);
      } catch {
        localStorage.removeItem(storageKey(slug));
      }
    }
  }, [event, isGoogleUser, session?.user?.name, slug]);

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

    if (event.myParticipant) {
      return event.myParticipant;
    }

    return {
      id: "draft",
      name,
      slots: [],
      updatedAt: new Date().toISOString(),
    };
  }, [event, participantId, name]);

  function handleSaved(participant: ParticipantResponse & { editToken: string }) {
    const sessionData: StoredSession = {
      editToken: participant.editToken,
      participantId: participant.id,
      name: participant.name,
    };
    localStorage.setItem(storageKey(slug), JSON.stringify(sessionData));
    setEditToken(participant.editToken);
    setParticipantId(participant.id);
    setName(participant.name);
    void loadEvent({ silent: true });
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

  if (loading || sessionStatus === "loading") {
    return (
      <div className="mx-auto flex min-h-[40vh] max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-zinc-500">Loading event…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
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
        <div className="rounded-xl border border-zinc-200 p-6 shadow-sm">
          <h1 className="text-xl font-semibold">{event.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">Password required</p>
          <div className="mt-5 space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(inputEvent) => setPasswordInput(inputEvent.target.value)}
              placeholder="Password"
              className="field-input"
            />
            {unlockError ? (
              <p className="notice-error">{unlockError}</p>
            ) : null}
            <button type="button" onClick={unlockEvent} className="btn-primary w-full">
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:py-8">
      <section className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {event.name}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
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
              className="field-input-readonly min-w-0 flex-1"
            />
            <button type="button" onClick={copyLink} className="btn-secondary shrink-0">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-zinc-800" htmlFor="participant-name">
              Your name
            </label>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
              {event.participants.length} response
              {event.participants.length === 1 ? "" : "s"}
            </span>
          </div>

          {!isGoogleUser ? (
            <GoogleSignInButton
              callbackUrl={shareUrl || `/e/${slug}`}
              label="Continue with Google"
            />
          ) : null}

          <input
            id="participant-name"
            value={name}
            onChange={(inputEvent) => setName(inputEvent.target.value)}
            placeholder="Add your name"
            readOnly={nameLocked}
            className={nameLocked ? "field-input-readonly" : "field-input"}
          />
          {nameLocked ? (
            <p className="text-xs text-zinc-500">Signed in with Google</p>
          ) : (
            <p className="text-xs text-zinc-500">
              Or enter your name manually above
            </p>
          )}
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
