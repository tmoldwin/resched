"use client";

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
      {session.user.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={session.user.image}
          alt=""
          className="h-8 w-8 rounded-full border border-zinc-200"
        />
      ) : null}
      <span className="hidden text-sm text-zinc-600 sm:inline">{session.user.name}</span>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="text-sm text-zinc-600 transition hover:text-zinc-900"
      >
        Sign out
      </button>
    </div>
  );
}
