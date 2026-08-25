import type { Metadata } from "next";
import Link from "next/link";
import { Zap } from "lucide-react";

import { HealthPill } from "@/components/hermes/health-pill";
import { HermesNav } from "@/components/hermes/hermes-nav";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hermes — HermesMQ console",
  description:
    "Operator console for HermesMQ: topics, subscriptions, publishing, and live statistics.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-dvh">
        <Providers>
          <header className="border-b border-border bg-background/80 backdrop-blur">
            <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <Link href="/" className="flex items-center gap-2">
                  <span className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                    <Zap className="size-5" />
                  </span>
                  <span className="text-lg font-semibold tracking-tight">Hermes</span>
                  <span className="hidden text-sm text-muted-foreground sm:inline">
                    HermesMQ console
                  </span>
                </Link>
                <HealthPill />
              </div>
              <HermesNav />
            </div>
          </header>
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
