# Auth (Supabase)

Supabase Auth sits in front of the AeroScope console. The landing page at `/` is public; anything under `/dashboard` requires a signed-in user.

## How it fits together

```
Browser ──▶ middleware.ts ──▶ refreshes Supabase session on every request
                │
                ├─▶ /                 public landing page
                ├─▶ /login            UI terminal — calls createClient() (browser) to sign in
                ├─▶ /auth/callback    exchanges OAuth code → session, redirects to /dashboard
                ├─▶ /auth/signout     POST → clears session → redirects to /
                └─▶ /dashboard/*      protected app shell (middleware redirects to /login if no user)
```

### Files

| File | Role |
|---|---|
| `utils/supabase/client.ts` | Browser client (`createClient()` — use in Client Components) |
| `utils/supabase/server.ts` | Server client (`createClient(cookieStore)` — use in Server Components, Route Handlers, Server Actions) |
| `utils/supabase/middleware.ts` | Session-refresh helper (not wired yet — root `middleware.ts` inlines the logic) |
| `utils/supabase/getUser.ts` | `getUser()` — one-liner for protected Server Components |
| `middleware.ts` | Runs on every non-static request; refreshes the session cookie AND gates `/dashboard/*` |
| `app/auth/callback/route.ts` | GET handler for OAuth `?code=` exchange |
| `app/auth/signout/route.ts` | POST handler that clears the session |

## Sign-in flows supported

- **Email + password sign-in** — `supabase.auth.signInWithPassword({ email, password })` for existing users.
- **Email + password sign-up** — `supabase.auth.signUp({ email, password })` for new users. If Supabase has "Confirm email" enabled (the default), the user gets a confirmation link that hits `/auth/callback` and completes the session. With confirmation off, sign-up signs the user in immediately.

The login page (`app/login/page.tsx`) surfaces both via a sign-in / sign-up toggle. Google OAuth, magic link, and other providers are intentionally off for this build.

## How the UI consumes it

### Login (Client Component)

```tsx
"use client";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// Sign in
await supabase.auth.signInWithPassword({ email, password });

// Sign up
await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${location.origin}/auth/callback?next=/dashboard`,
  },
});
```

### Protected Server Component

```tsx
import { getUser } from "@/utils/supabase/getUser";

export default async function DashboardPage() {
  const user = await getUser();
  // middleware already redirected unauth to /login, so user is non-null here
  return <div>Hello, {user?.email}</div>;
}
```

### Sign out

```tsx
<form action="/auth/signout" method="POST">
  <button type="submit">Sign out</button>
</form>
```

The dashboard's `Topbar` uses a fetch-based equivalent (`signOutAndRedirect()` in `lib/api-client.ts`) so the click can stay in-page without a full form submit.

## Supabase dashboard — one-time setup

Dashboard → **Authentication → URL Configuration**:

- **Site URL**: your production Vercel URL (e.g. `https://aeroscope-neo4j-hackathon.vercel.app`)
- **Redirect URLs** (add all three):
  - `http://localhost:3000/auth/callback`
  - `https://aeroscope-neo4j-hackathon.vercel.app/auth/callback`
  - `https://aeroscope-neo4j-hackathon-*.vercel.app/auth/callback` (Vercel preview deploys)

Dashboard → **Authentication → Providers → Email**:

- Keep **Email** enabled — both sign-in and sign-up with password.
- Toggle **Confirm email** off for the hackathon demo to make sign-up instant (otherwise the user gets a confirmation link and cannot reach `/dashboard` until they click it).

## Local dev

```bash
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

npm install
npm run dev
# → http://localhost:3000
```

`.env.local` is gitignored; `.env.example` is the committed template.

## Vercel deploy — env vars to set

Project → Settings → Environment Variables. Add to **Production**, **Preview**, and **Development**:

| Name | Sensitivity |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Safe to expose |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Safe to expose |
| `NEO4J_URI` | Safe-ish |
| `NEO4J_USER` | Safe-ish |
| `NEO4J_PASSWORD` | **Secret** |

After the first deploy, grab the production URL and add it to the Supabase dashboard's redirect list (above).

## Key rotation

If the Supabase service role key or Neo4j password ever leaks: rotate in the respective dashboard, update the Vercel env var, then trigger a redeploy. `NEXT_PUBLIC_*` keys are browser-safe and rarely need rotation.
