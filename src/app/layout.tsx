import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { HermesSidebar } from "@/components/hermes/hermes-sidebar";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Hermes — HermesMQ console",
  description:
    "Operator console for HermesMQ: topics, subscriptions, publishing, and live statistics.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <Providers>
          <div className="flex min-h-dvh">
            <HermesSidebar />
            <main className="relative min-w-0 flex-1">
              {/* Faint god-mark watermark behind the main view (standard §5) —
                  fixed, pointer/aria-inert, very low opacity: texture, not
                  distraction. Offset past the sidebar. */}
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
