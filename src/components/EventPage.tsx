"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import AvailabilityGrid from "@/components/AvailabilityGrid";
import {
  clearStoredUnlock,
  getStoredSession,
  getStoredUnlockPassword,
  hasEventIdentity,
  setStoredSession,
  setStoredUnlockPassword,
  type StoredSession,
} from "@/lib/event-session";
import type { EventResponse, ParticipantResponse } from "@/lib/types";

type EventPageProps = {
  slug: string;
  initialView?: "edit" | "group";
};

export default function EventPage({ slug, initialView = "edit" }: EventPageProps) {
  const router = useRouter();
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
  const [identityChecked, setIdentityChecked] = useState(false);

  const isGoogleUser = Boolean(session?.user?.id);

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
    setShareUrl(`${window.location.origin}/e/${slug}`);
  }, [slug]);

  useEffect(() => {
    const password = getStoredUnlockPassword(slug);
    if (password) {
      setStoredPassword(password);
      setUnlocked(true);
    }
  }, [slug]);

  useEffect(() => {
    if (!event || sessionStatus === "loading") return;

    if (event.myParticipant) {
      setEditToken(event.myParticipant.editToken);
      setParticipantId(event.myParticipant.id);
      setName(event.myParticipant.name);
      setStoredSession(slug, {
        editToken: event.myParticipant.editToken,
        participantId: event.myParticipant.id,
        name: event.myParticipant.name,
      });
      setIdentityChecked(true);
      return;
    }

    const stored = getStoredSession(slug);
    if (stored) {
      setEditToken(stored.editToken ?? null);
      setParticipantId(stored.participantId ?? null);
      setName(stored.name);
      setIdentityChecked(true);
      return;
    }

    if (isGoogleUser && session?.user?.name) {
      setName(session.user.name);
      setIdentityChecked(true);
      return;
    }

    setIdentityChecked(true);
  }, [event, isGoogleUser, session?.user?.name, sessionStatus, slug]);

  useEffect(() => {
    if (!identityChecked || loading || sessionStatus === "loading" || !event) return;
    if (event.locked && !unlocked) return;

    const identity = hasEventIdentity({
      storedSession: getStoredSession(slug),
      myParticipant: Boolean(event.myParticipant),
      googleName: isGoogleUser ? session?.user?.name : null,
    });

    if (!identity && !name.trim()) {
      router.replace(`/e/${slug}/join`);
    }
  }, [
    event,
    identityChecked,
    isGoogleUser,
    loading,
    name,
    router,
    session?.user?.name,
    sessionStatus,
    slug,
    unlocked,
  ]);

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
    setStoredSession(slug, sessionData);
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

      setStoredUnlockPassword(slug, passwordInput);
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

  function handlePasswordRejected() {
    clearStoredUnlock(slug);
    setStoredPassword(null);
    setPasswordInput("");
    setUnlocked(false);
    setUnlockError("The saved password no longer works — please enter it again.");
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (loading || sessionStatus === "loading" || !identityChecked) {
    return (
      <div className="page-shell flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading event…</p>
      </div>
    );
  }

  if (identityChecked && event && !name.trim() && !event.myParticipant && !(isGoogleUser && session?.user?.name)) {
    return (
      <div className="page-shell flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Redirecting…</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="page-shell py-16 text-center">
        <h1 className="page-title">Event not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {error || "This link may be invalid."}
        </p>
      </div>
    );
  }

  if (event.locked && !unlocked) {
    return (
      <div className="page-shell flex min-h-[50vh] items-center justify-center">
        <div className="card w-full max-w-md space-y-5">
          <div>
            <h1 className="text-xl font-semibold">{event.name}</h1>
            <p className="mt-1 text-sm text-zinc-500">Enter the event password to continue</p>
          </div>
          <input
            type="password"
            value={passwordInput}
            onChange={(inputEvent) => setPasswordInput(inputEvent.target.value)}
            placeholder="Password"
            className="field-input"
          />
          {unlockError ? <p className="notice-error">{unlockError}</p> : null}
          <button type="button" onClick={unlockEvent} className="btn-primary w-full">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-8">
      <section className="space-y-5">
        <div>
          <h1 className="page-title">{event.name}</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            {event.startDate} to {event.endDate} · {event.timezone}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-600">
            Editing as <span className="font-medium text-zinc-900">{name}</span>
            {!isGoogleUser ? (
              <>
                {" · "}
                <Link
                  href={`/e/${slug}/join?change=1`}
                  className="text-zinc-700 underline-offset-2 hover:underline"
                >
                  Change
                </Link>
              </>
            ) : null}
          </p>
          <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600">
            {event.participants.length} response
            {event.participants.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-zinc-800" htmlFor="share-link">
            Share link
          </label>
          <div className="input-group">
            <input
              id="share-link"
              readOnly
              value={shareUrl}
              className="field-input-readonly"
            />
            <button type="button" onClick={copyLink} className="btn-secondary">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      </section>

      <AvailabilityGrid
        event={event}
        activeParticipant={activeParticipant}
        editToken={editToken}
        password={event.locked ? storedPassword || passwordInput : null}
        onSaved={handleSaved}
        onPasswordRejected={handlePasswordRejected}
        initialMode={initialView}
      />
    </div>
  );
}
