# Deploy cheatsheet

Operator notes for running AeroScope on Vercel. One page, top to bottom.

## Prerequisites

- A Vercel account with access to this project (free tier is fine).
- `vercel` CLI: `npm i -g vercel` (or use `npx vercel`).
- `gh` CLI authenticated: `gh auth login` — only needed if you want to wire the GitHub integration from the terminal.
- A Neo4j Aura instance in an EU region (`fra1` is the Vercel region we pin to, so EU Aura keeps the round-trip short).

## First-time deploy

```bash
# 1. Link this repo to a Vercel project
vercel link

# 2. Add environment variables (Preview + Production)
#    Run each of these; the CLI will prompt for the value.
vercel env add NEO4J_URI
vercel env add NEO4J_USER
vercel env add NEO4J_PASSWORD
vercel env add ADMIN_USERNAME
vercel env add ADMIN_PASSWORD
vercel env add AUTH_COOKIE_SECRET     # 32+ random chars, e.g. `openssl rand -hex 32`

# 3. First production deploy
vercel --prod
```

You can also set the same env vars in the Vercel dashboard: **Project → Settings → Environment Variables**. Make sure each is enabled for Production and Preview.

## Subsequent deploys

Once the GitHub ↔ Vercel integration is connected (dashboard: **Project → Settings → Git**), pushes to `main` trigger production deploys automatically. Pull requests get preview deployments.

CI in `.github/workflows/ci.yml` runs `npm run build` and `npm run scrub-check` on every push/PR — merge is blocked if either fails.

## Rollback

```bash
# Find the last good deployment
vercel ls

# Promote it to production
vercel rollback <deployment-url>
```

The dashboard equivalent: **Deployments → pick one → Promote to Production**.

## Rotate the admin password

1. Dashboard: **Project → Settings → Environment Variables**.
2. Edit `ADMIN_PASSWORD` (and optionally `ADMIN_USERNAME`). Save.
3. Trigger a redeploy so the new value takes effect — either push an empty commit, or click **Redeploy** on the latest production deployment.

Existing sessions keep working until their cookie expires. To force everyone out immediately, also rotate `AUTH_COOKIE_SECRET` — that invalidates every signed cookie issued under the old secret.

## Region and bundling notes

- `vercel.json` pins serverless functions to `fra1` (Frankfurt) and sets `maxDuration: 20` for `/api/query`.
- `aura/cypher_templates/*.json` are bundled into the `/api/query` function via `includeFiles`, so `fs.readFile("aura/cypher_templates/...")` works at runtime.
- `.vercelignore` keeps the Python pipeline, docs, and synthetic data out of the upload — the build only sees the Next.js app and the Cypher templates it needs.
