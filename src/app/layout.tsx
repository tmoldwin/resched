import type { Metadata } from "next";
import { IBM_Plex_Mono, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import Link from "next/link";
import AuthHeader from "@/components/AuthHeader";
import Logo from "@/components/Logo";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans-family",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const brand = Space_Grotesk({
  variable: "--font-brand-family",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-family",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Resched",
  description: "Find a time that works for everyone.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${brand.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-white font-sans text-zinc-900">
        <SessionProvider>
          <header className="border-b border-zinc-200">
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
              <Link href="/" className="transition hover:opacity-90">
                <Logo />
              </Link>
              <AuthHeader />
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-zinc-200">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 py-4 text-sm text-zinc-500">
              <Link href="/privacy" className="hover:text-zinc-900">
                Privacy Policy
              </Link>
              <span aria-hidden="true">·</span>
              <Link href="/terms" className="hover:text-zinc-900">
                Terms of Service
              </Link>
            </div>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
