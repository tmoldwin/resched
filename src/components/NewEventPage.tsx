"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import CreateEventForm from "@/components/CreateEventForm";

export default function NewEventPage() {
  const searchParams = useSearchParams();
  const cloneSlug = searchParams.get("clone") ?? undefined;

  return (
    <div className="page-shell">
      <div className="mx-auto max-w-lg space-y-8">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-zinc-500 transition hover:text-zinc-900">
            ← Back
          </Link>
          <h1 className="page-title">
            {cloneSlug ? "Clone event" : "Create an event"}
          </h1>
          <p className="page-lead">
            {cloneSlug
              ? "Settings are copied from the original — pick new dates below."
              : "Share the link and let people mark when they're free."}
          </p>
        </header>

        <CreateEventForm cloneSlug={cloneSlug} />
      </div>
    </div>
  );
}
