"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import {
  getStoredSession,
  getStoredUnlockPassword,
  resolveEventIdentity,
  setStoredSession,
  setStoredUnlockPassword,
} from "@/lib/event-session";
import type { EventResponse } from "@/lib/types";

type EventJoinPageProps = {
  slug: string;
};

export default function EventJoinPage({ slug }: EventJoinPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isChangingName = searchParams.get("change") === "1";
  const { data: session, status: sessionStatus } = useSession();
  const [event, setEvent] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [clientReady, setClientReady] = useState(false);

  const isGoogleUser = Boolean(session?.user?.id);
  const nameLocked = isGoogleUser;

  useLayoutEffect(() => {
    if (getStoredUnlockPassword(slug)) {
      setUnlocked(true);
    }

    const stored = getStoredSession(slug);
    if (stored?.name) {
      setName(stored.name);
    }

    setClientReady(true);
  }, [slug]);

  useEffect(() => {
    async function loadEvent() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/events/${slug}`, { cache: "no-store" });
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
    }

    void loadEvent();
  }, [slug]);

  const identity = useMemo(
    () =>
      resolveEventIdentity(slug, event, {
        googleName: isGoogleUser ? session?.user?.name : null,
      }),
    [event, isGoogleUser, session?.user?.name, slug, clientReady],
  );

  const appReady =
    clientReady && !loading && sessionStatus !== "loading" && Boolean(event);

  const needsEvent =
    appReady &&
    !isChangingName &&
    identity.hasIdentity &&
    (!event?.locked || unlocked);

  const eventRedirectedRef = useRef(false);

  useLayoutEffect(() => {
    if (!needsEvent || !event || eventRedirectedRef.current) return;
    eventRedirectedRef.current = true;

    if (isGoogleUser && session?.user?.name && !isChangingName) {
      const stored = getStoredSession(slug);
      setStoredSession(slug, {
        name: session.user.name,
        editToken: stored?.editToken,
        participantId: stored?.participantId,
      });
    }

    router.replace(`/e/${slug}`);
  }, [
    event,
    isChangingName,
    isGoogleUser,
    needsEvent,
    router,
    session?.user?.name,
    slug,
  ]);

  useEffect(() => {
    if (!appReady || !event || isChangingName) return;
    if (isGoogleUser && session?.user?.name && !name) {
      setName(session.user.name);
    }
  }, [appReady, event, isChangingName, isGoogleUser, name, session?.user?.name]);

  function continueToEvent() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const existing = getStoredSession(slug);
    const nameChanged =
      existing?.name.trim().toLocaleLowerCase() !== trimmed.toLocaleLowerCase();

    if (nameChanged) {
      setStoredSession(slug, { name: trimmed });
    } else {
      setStoredSession(slug, {
        name: trimmed,
        editToken: existing?.editToken,
        participantId: existing?.participantId,
      });
    }

    router.push(`/e/${slug}`);
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
      setUnlocked(true);
    } catch (unlockFailure) {
      setUnlockError(
        unlockFailure instanceof Error
          ? unlockFailure.message
          : "Invalid password.",
      );
    }
  }

  if (!clientReady || loading || sessionStatus === "loading") {
    return (
      <div className="page-shell flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
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

  if (needsEvent) {
    return (
      <div className="page-shell flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="page-shell flex min-h-[50vh] items-center justify-center">
      <div className="card w-full max-w-md space-y-6">
        {isChangingName ? (
          <Link
            href={`/e/${slug}`}
            className="inline-block text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            ← Back to event
          </Link>
        ) : null}

        <div className="space-y-1">
          <p className="section-label">
            {isChangingName ? "Update name" : "Join event"}
          </p>
          <h1 className="text-xl font-semibold text-zinc-900">{event.name}</h1>
          <p className="text-sm text-zinc-500">
            {event.startDate} to {event.endDate}
          </p>
        </div>

        {!isGoogleUser ? (
          <GoogleSignInButton
            callbackUrl={
              isChangingName ? `/e/${slug}/join?change=1` : `/e/${slug}/join`
            }
            label="Continue with Google"
          />
        ) : null}

        {!isGoogleUser ? (
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs text-zinc-400">or</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-800" htmlFor="join-name">
            Your name
          </label>
          <input
            id="join-name"
            value={name}
            onChange={(inputEvent) => setName(inputEvent.target.value)}
            placeholder="Add your name"
            readOnly={nameLocked}
            className={nameLocked ? "field-input-readonly" : "field-input"}
          />
          {nameLocked ? (
            <p className="text-xs text-zinc-500">From your Google account</p>
          ) : isChangingName ? (
            <p className="text-xs text-zinc-500">
              Changing your name starts a fresh response for this event.
            </p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={continueToEvent}
          disabled={!name.trim()}
          className="btn-primary w-full"
        >
          Continue
        </button>

        {!isChangingName ? (
          <p className="text-center text-xs text-zinc-500">
            Already joined?{" "}
            <Link
              href={`/e/${slug}`}
              className="text-zinc-700 underline-offset-2 hover:underline"
            >
              Go to event
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
