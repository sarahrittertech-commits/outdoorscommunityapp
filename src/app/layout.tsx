import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Young_Serif } from "next/font/google";
import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { BranchMark } from "@/components/BranchMark";
import { site } from "@/config/site";
import { getViewer } from "@/lib/auth";

import "./globals.css";

// Self-hosted at build time, so pages make no requests to Google (CSP: font-src 'self').
const atkinson = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-atkinson",
  display: "swap",
});
const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400", variable: "--font-young-serif", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, type: "website" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();

  return (
    <html lang="en" className={`${atkinson.variable} ${youngSerif.variable}`}>
      <body className="pb-16">
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <header className="border-b border-rule">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="wordmark flex items-center gap-2 text-2xl no-underline">
              <BranchMark className="h-7 w-7" />
              {site.name}
            </Link>
            <nav aria-label="Main" className="flex items-baseline gap-x-4">
              <Link href="/">explore</Link>
              <Link href="/events">events</Link>
              <Link href="/communities">communities</Link>
            </nav>
            <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
              <form action="/search" role="search" className="hidden md:block">
                <label htmlFor="site-search" className="sr-only">
                  Search events, places, groups
                </label>
                <input
                  id="site-search"
                  name="q"
                  type="search"
                  placeholder="search events, places, groups"
                  className="mt-0 w-64 py-1.5 text-base"
                />
              </form>
              <Link href="/post" className="button py-1.5">
                + post
              </Link>
              {viewer ? (
                <>
                  <Link href="/me">my stuff</Link>
                  {viewer.isSiteAdmin && <Link href="/admin">admin</Link>}
                  <form action={signOut} className="inline">
                    <button className="link-button">sign out</button>
                  </form>
                </>
              ) : (
                <Link href="/signin">sign in</Link>
              )}
            </div>
          </div>
        </header>

        {viewer?.suspended && (
          <p role="status" className="mx-auto mt-3 max-w-6xl rounded bg-warning px-3 py-2 text-sm">
            Your account is suspended. You can read, but not post, join or RSVP.
          </p>
        )}

        <main id="main" className="mx-auto max-w-6xl px-4 pt-6">
          {children}
        </main>

        <footer className="mx-auto mt-16 max-w-6xl border-t border-rule px-4 pt-4 text-sm text-muted">
          <p>
            No ads. No feed. No tracking. Lists are sorted by name or date, the same for everyone.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4">
            <Link href="/browse">browse all</Link>
            <Link href="/events">all events</Link>
            <Link href="/communities">communities</Link>
            <Link href="/about">about</Link>
            <Link href="/guidelines">community guidelines</Link>
            <Link href="/terms">terms</Link>
            <Link href="/privacy">privacy</Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
