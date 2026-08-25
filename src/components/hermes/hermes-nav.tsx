"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Radio, Send, Waypoints } from "lucide-react";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Topics", icon: Send, exact: true },
  { href: "/publish", label: "Publish", icon: Radio, exact: false },
  { href: "/subscriptions", label: "Subscriptions", icon: Waypoints, exact: false },
  { href: "/stats", label: "Statistics", icon: BarChart3, exact: false },
];

/** Primary Hermes navigation — the four top-level views of the console. */
export function HermesNav() {
  const pathname = usePathname();

  return (
    <nav
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1"
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
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
