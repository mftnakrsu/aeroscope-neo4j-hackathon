"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  href: string;
  label: string;
  /** Exact match (`/dashboard`) vs. prefix match for nested tabs. */
  exact?: boolean;
  icon: ReactNode;
};

const ANALYSIS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Requirements",
    exact: true,
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
    ),
  },
  {
    href: "/dashboard/graph",
    label: "Graph",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    href: "/dashboard/impact",
    label: "Impact Analysis",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77 5.82 21l1.18-6.88L2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    href: "/dashboard/query",
    label: "Query",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <polyline points="4 17 10 11 4 5" />
        <line x1="12" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
];

const CORPUS: NavItem[] = [
  {
    href: "/dashboard/corpus/requirements",
    label: "All Requirements",
    icon: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Sidenav() {
  const pathname = usePathname() ?? "/dashboard";
  return (
    <nav
      aria-label="Primary"
      className="border-r border-line bg-bg-1 overflow-y-auto py-4"
      style={{ gridArea: "nav" }}
    >
      <Section label="Analysis">
        {ANALYSIS.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
      </Section>
      <Section label="Corpus">
        {CORPUS.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(pathname, item)} />
        ))}
      </Section>

      <div className="mt-6 px-4">
        <div className="card p-3 text-[11px] leading-relaxed text-text-3">
          <div className="font-mono uppercase tracking-wider text-text-3 mb-1">
            Corpus
          </div>
          <div className="text-text-2">
            30 modules · ~1,000 synthetic requirements across 4 platforms.
          </div>
        </div>
      </div>
    </nav>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="px-4 mb-2 text-[10px] font-mono uppercase tracking-wider text-text-3">
        {label}
      </div>
      <ul className="flex flex-col gap-0.5 px-2">{children}</ul>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <li className="relative">
      {active ? (
        <span
          aria-hidden
          className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r bg-accent"
        />
      ) : null}
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={[
          "flex items-center gap-2.5 pl-4 pr-3 h-9 rounded-md text-[13px] transition-colors",
          active
            ? "bg-bg-3 text-text"
            : "text-text-2 hover:bg-bg-hover hover:text-text",
        ].join(" ")}
      >
        <span className={active ? "text-accent" : "text-text-3"}>{item.icon}</span>
        {item.label}
      </Link>
    </li>
  );
}
