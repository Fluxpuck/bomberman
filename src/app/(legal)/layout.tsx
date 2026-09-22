import type { Metadata } from "next";
import Link from "next/link";

// =========================
// Legal pages layout
// =========================
// Shared chrome for /terms-of-service and /privacy-policy. These routes are
// intentionally unlinked from the game UI — they exist for the Discord app
// listing (ToS/privacy URLs) and are reached directly by URL.

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="h-screen overflow-y-auto bg-ui-ink text-ui-text font-sans">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {children}
        <div className="mt-12">
          <Link href="/" className="text-ui-muted hover:text-ui-cyan text-sm">
            ← Back to game
          </Link>
        </div>
      </div>
    </main>
  );
}
