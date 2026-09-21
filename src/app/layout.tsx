import type { Metadata } from "next";
import { Bungee, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const bungee = Bungee({ weight: "400", subsets: ["latin"], variable: "--font-bungee" });
const spaceGrotesk = Space_Grotesk({ weight: ["500", "700"], subsets: ["latin"], variable: "--font-space" });
const jetbrainsMono = JetBrains_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-mono" });

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
