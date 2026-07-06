import type { ReactNode } from "react";

type LegalPageProps = {
  title: string;
  children: ReactNode;
};

export default function LegalPage({ title, children }: LegalPageProps) {
  return (
    <div className="page-shell">
      <article className="legal-prose">
        <header className="mb-8 space-y-2 border-b border-zinc-200 pb-6">
          <h1 className="page-title">{title}</h1>
          <p className="text-sm text-zinc-500">Last updated: July 6, 2026</p>
        </header>
        {children}
        <footer className="mt-10 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
          <p>
            Questions? Contact us at{" "}
            <a href="mailto:hello@resched.app" className="text-zinc-700 underline-offset-2 hover:underline">
              hello@resched.app
            </a>
            .
          </p>
        </footer>
      </article>
    </div>
  );
}
