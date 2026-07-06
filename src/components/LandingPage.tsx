"use client";

import { useState } from "react";
import type { Session } from "next-auth";
import CreateEventForm from "@/components/CreateEventForm";
import EventsDashboard from "@/components/EventsDashboard";
import GoogleSignInButton from "@/components/GoogleSignInButton";

type LandingPageProps = {
  session: Session | null;
};

export default function LandingPage({ session }: LandingPageProps) {
  const [guestMode, setGuestMode] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  if (session?.user) {
    return (
      <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:py-14">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Welcome back{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            Your events and availability in one place.
          </p>
        </header>

        <EventsDashboard />

        <section className="space-y-4 border-t border-zinc-200 pt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900">Create a new event</h2>
            {!showCreateForm ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
              >
                New event
              </button>
            ) : null}
          </div>
          {showCreateForm ? <CreateEventForm /> : null}
        </section>
      </div>
    );
  }

  if (guestMode) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-14">
        <header className="max-w-lg space-y-3">
          <button
            type="button"
            onClick={() => setGuestMode(false)}
            className="text-sm text-zinc-500 transition hover:text-zinc-900"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Create an event
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            No account needed — share the link and collect availability.
          </p>
        </header>

        <CreateEventForm />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-lg space-y-8 text-center">
        <header className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            Find a time that works for everyone
          </h1>
          <p className="text-base leading-7 text-zinc-600">
            Create events, share links, and see when your group overlaps — with
            optional Google sign-in to track your events.
          </p>
        </header>

        <div className="space-y-3">
          <GoogleSignInButton callbackUrl="/" />
          <button
            type="button"
            onClick={() => setGuestMode(true)}
            className="btn-secondary w-full"
          >
            Continue without login
          </button>
        </div>
      </div>
    </div>
  );
}
