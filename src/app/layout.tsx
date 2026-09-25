import type { Metadata } from "next";
import Link from "next/link";

import { signOut } from "@/app/actions/auth";
import { site } from "@/config/site";
import { getViewer } from "@/lib/auth";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  openGraph: { siteName: site.name, type: "website" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const viewer = await getViewer();

  return (
    <html lang="en">
      <body className="mx-auto max-w-5xl px-4 pb-16">
        <a href="#main" className="sr-only focus:not-sr-only">
          Skip to content
        </a>
        <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-rule py-3">
          <Link href="/" className="text-lg font-bold text-ink no-underline visited:text-ink">
            {site.name}
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
            <Link href="/">groups</Link>
            <Link href="/events">events</Link>
            <Link href="/search">search</Link>
            {viewer ? (
              <>
                <Link href="/me">my stuff</Link>
                <Link href="/groups/new">start a group</Link>
                {viewer.isSiteAdmin && <Link href="/admin">admin</Link>}
                <form action={signOut} className="inline">
                  <button className="link-button">sign out</button>
                </form>
              </>
            ) : (
              <Link href="/signin">sign in</Link>
            )}
          </nav>
        </header>

        {viewer?.suspended && (
          <p role="status" className="mt-3 rounded bg-warning px-3 py-2 text-sm">
            Your account is suspended. You can read, but not post, join or RSVP.
          </p>
        )}

        <main id="main" className="pt-4">
          {children}
        </main>

        <footer className="mt-16 border-t border-rule pt-4 text-sm text-muted">
          <p>
            No ads. No feed. No tracking. Lists are sorted by name or date, the same for everyone.
          </p>
          <p className="mt-2 flex flex-wrap gap-x-4">
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
