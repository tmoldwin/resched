"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Session } from "next-auth";
import EventsDashboard from "@/components/EventsDashboard";
import GoogleSignInButton from "@/components/GoogleSignInButton";

type LandingPageProps = {
  session: Session | null;
};

export default function LandingPage({ session }: LandingPageProps) {
  const router = useRouter();

  if (session?.user) {
    return (
      <div className="page-shell space-y-10">
        <header className="space-y-2">
          <h1 className="page-title">
            Welcome back{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="page-lead">Your events and availability in one place.</p>
        </header>

        <EventsDashboard />

        <section className="flex flex-col gap-4 border-t border-zinc-200 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-brand text-lg font-semibold text-zinc-900">Create a new event</h2>
          <Link href="/new" className="btn-primary w-full sm:w-auto sm:min-w-44">
            New event
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell flex min-h-[60vh] items-center justify-center">
      <div className="card w-full max-w-md space-y-8 text-center">
        <header className="space-y-3">
          <h1 className="page-title">Find a time that works for everyone</h1>
          <p className="page-lead">
            Create events, share links, and see when your group overlaps.
          </p>
        </header>

        <div className="btn-stack">
          <GoogleSignInButton callbackUrl="/" />
          <button
            type="button"
            onClick={() => router.push("/new")}
            className="btn-secondary"
          >
            Continue without login
          </button>
        </div>
      </div>
    </div>
  );
}
