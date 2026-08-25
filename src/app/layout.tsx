import type { Metadata } from "next";

import { HermesSidebar } from "@/components/hermes/hermes-sidebar";
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
          <div className="flex min-h-dvh">
            <HermesSidebar />
            <main className="relative min-w-0 flex-1">
              {/* Faint logo watermark in the main view. Fixed and offset past
                  the sidebar, very low opacity, and pointer/aria-inert so it
                  reads as texture rather than distraction. */}
              <div
                aria-hidden
                className="pointer-events-none fixed inset-y-0 left-16 right-0 z-0 flex items-center justify-center overflow-hidden sm:left-60"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/hermes-logo.png"
                  alt=""
                  className="w-[36rem] max-w-[70%] select-none opacity-[0.05]"
                />
              </div>
              <div className="relative z-10">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
