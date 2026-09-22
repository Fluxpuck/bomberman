import type { Metadata } from "next";
// Vendored woff2 files (Google Fonts, latin subset) — next/font/google fetches
// fonts at build time, which fails in the Docker build's restricted network.
import localFont from "next/font/local";
import "./globals.css";

const bungee = localFont({
  src: "./fonts/bungee.woff2",
  weight: "400",
  variable: "--font-bungee",
});
const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk.woff2",
  weight: "300 700",
  variable: "--font-space",
});
const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono.woff2",
  weight: "100 800",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Bomb Blast Arena",
  description: "A simple Bomb Blast Arena game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${bungee.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} overflow-hidden font-sans text-ui-text`}
      >{children}</body>
    </html>
  );
}
