import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bomberman",
  description: "A simple Bomberman game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
