import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lentera — Autonomous Risk-Aware Portfolio Assistant",
  description:
    "Autonomous Risk-Aware Portfolio Assistant for Sibyl Labs Hackathon on Base Sepolia with load-bearing memory execution guard.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full dark">
      <body className="flex h-full flex-col bg-[#090a10] text-[#f3f4f6] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
