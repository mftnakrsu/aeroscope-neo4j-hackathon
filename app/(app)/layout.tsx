import type { ReactNode } from "react";
import { Sidenav } from "@/components/dashboard/Sidenav";
import { Topbar } from "@/components/dashboard/Topbar";
import { getUser } from "@/utils/supabase/getUser";

/**
 * Shared shell for every authenticated screen. CSS grid with named areas:
 * the topbar spans both columns, sidenav fills the left 240px column under
 * it, and main fills the remainder. The middleware gates /dashboard/* on
 * an authenticated Supabase session; here we just fetch the user so the
 * topbar can display their email.
 */
export default async function AppShellLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await getUser();

  return (
    <div
      className="min-h-screen bg-bg text-text"
      style={{
        display: "grid",
        gridTemplateColumns: "var(--nav-w) 1fr",
        gridTemplateRows: "56px 1fr",
        gridTemplateAreas: `"topbar topbar" "nav main"`,
      }}
    >
      <Topbar userEmail={user?.email ?? null} />
      <Sidenav />
      <main style={{ gridArea: "main" }} className="overflow-y-auto">
        <div className="max-w-[1200px] mx-auto px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
