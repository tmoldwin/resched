"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function AuthHeader() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-8 w-24 animate-pulse rounded bg-zinc-100" />;
  }

  if (!session?.user) {
    return <GoogleSignInButton callbackUrl="/" className="btn-google" label="Sign in" />;
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="flex items-center gap-2.5 rounded-lg py-1 pr-1 transition hover:bg-zinc-50"
        title="My events"
      >
        {session.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.image}
            alt=""
            className="h-8 w-8 rounded-full border border-zinc-200"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-xs font-medium text-zinc-600">
            {session.user.name?.charAt(0) ?? "?"}
          </span>
        )}
        <span className="hidden text-sm font-medium text-zinc-700 sm:inline">
          {session.user.name}
        </span>
      </Link>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-sm text-zinc-500 transition hover:text-zinc-900"
      >
        Sign out
      </button>
    </div>
  );
}
