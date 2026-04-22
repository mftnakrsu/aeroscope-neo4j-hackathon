"use client";

import { signOutAndRedirect } from "@/lib/api-client";

type TopbarProps = {
  /** Email of the currently signed-in Supabase user. Null only during logout. */
  userEmail?: string | null;
};

/**
 * Fixed 56px topbar: brand mark + search + status pill + user pill + logout.
 * The center search input is decorative for the first live cut; we leave the
 * element in place with a disabled submit handler so the layout locks in,
 * and a later iteration can wire it up without touching the shell.
 */
export function Topbar({ userEmail }: TopbarProps) {
  async function handleLogout() {
    await signOutAndRedirect();
  }

  return (
    <header
      className="sticky top-0 z-30 h-14 border-b border-line bg-bg-1 px-4 flex items-center gap-4"
      style={{ gridArea: "topbar" }}
    >
      <div className="flex items-center gap-2.5 min-w-[224px]">
        <div className="brand-mark">AS</div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">AeroScope</div>
          <div className="text-[10px] font-mono text-text-3 uppercase tracking-wider">
            Neo4j Aura Agent
          </div>
        </div>
      </div>

      <form
        role="search"
        onSubmit={(event) => {
          // Search is decorative for the first live cut; block the form
          // submit so the page does not reload and we do not 404 against a
          // missing route.
          event.preventDefault();
        }}
        className="flex-1 max-w-xl"
      >
        <label className="sr-only" htmlFor="topbar-search">
          Search AeroScope
        </label>
        <div className="relative">
          <svg
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-3"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            id="topbar-search"
            type="search"
            placeholder="Search requirements, modules, standards..."
            className="input h-9 pl-8 text-[13px]"
          />
          <kbd className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 items-center gap-0.5 text-[10px] font-mono text-text-3 border border-line rounded px-1.5 py-0.5 bg-bg-3">
            /
          </kbd>
        </div>
      </form>

      <div className="flex items-center gap-3">
        <StatusPill />
        <UserPill email={userEmail ?? null} />
        <button
          type="button"
          onClick={handleLogout}
          className="btn sm ghost"
          aria-label="Sign out"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}

function StatusPill() {
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-mono text-green border border-green/30 bg-green/10 rounded-full px-2.5 h-7">
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full bg-green"
        style={{ animation: "pulse 2s ease-in-out infinite" }}
      />
      Aura connected
    </span>
  );
}

function UserPill({ email }: { email: string | null }) {
  const display = email ?? "guest";
  const initial = display.charAt(0).toUpperCase() || "?";
  return (
    <span className="inline-flex items-center gap-2 text-xs font-medium text-text-2 border border-line bg-bg-2 rounded-full pl-1 pr-3 h-7 max-w-[220px]">
      <span
        aria-hidden
        className="w-5 h-5 rounded-full grid place-items-center bg-bg-3 text-[10px] font-mono text-accent border border-line flex-shrink-0"
      >
        {initial}
      </span>
      <span className="truncate">{display}</span>
    </span>
  );
}
