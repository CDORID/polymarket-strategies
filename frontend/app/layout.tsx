import type { Metadata } from "next";
import "./globals.css";
import { NavHeader } from "@/components/nav-header";

export const metadata: Metadata = {
  title: "PolyStrat — Polymarket Strategy Platform",
  description: "Backtest and evaluate trading strategies on Polymarket prediction markets",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <NavHeader />
        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </main>
      </body>
    </html>
  );
}
