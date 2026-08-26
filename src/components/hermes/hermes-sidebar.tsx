"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FileText, Radio, Send, Waypoints } from "lucide-react";

import { HealthPill } from "./health-pill";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Topics", icon: Send, exact: true },
  { href: "/publish", label: "Publish", icon: Radio, exact: false },
  { href: "/subscriptions", label: "Subscriptions", icon: Waypoints, exact: false },
  { href: "/stats", label: "Statistics", icon: BarChart3, exact: false },
  { href: "/docs", label: "API", icon: FileText, exact: false },
];

/**
 * The primary navigation, moved from a top bar to a persistent left sidebar to
 * unify the console's chrome. Carries the Hermes logo + wordmark (top-left), the
 * four views as a vertical nav, and the live health pill pinned to the bottom.
 * Collapses to an icon-only rail below the `sm` breakpoint (labels hidden).
 */
export function HermesSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-20 flex h-dvh w-16 shrink-0 flex-col border-r border-border bg-sidebar sm:w-60">
      {/* Brand — the god mark top-left (the mark is the only logo; the text is a
          decorative, aria-hidden accent label, per the standard). */}
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-4 sm:px-4"
        aria-label="Hermes — home"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hermes-logo.png"
          alt="Hermes"
          width={40}
          height={40}
          className="size-9 shrink-0"
        />
        <span
          aria-hidden="true"
          className="hidden text-lg font-semibold tracking-tight text-primary sm:inline"
        >
          Hermes
        </span>
      </Link>

      {/* Views */}
      <nav
        className="flex-1 space-y-1 px-2 sm:px-3"
        aria-label="Hermes views"
      >
        {TABS.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={tab.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-center gap-3 rounded-md border-l-2 px-2.5 py-2 text-sm font-medium transition-colors sm:justify-start sm:px-3",
                active
                  ? "glow-primary border-primary bg-primary/10 text-primary"
                  : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Health, pinned to the bottom */}
      <div className="border-t border-border p-3">
        <HealthPill />
      </div>
    </aside>
  );
}
