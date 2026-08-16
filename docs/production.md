# Production hosting — saar.to

Decision date: 2026-08-16

## Decision

| Layer | Choice | Tier |
|-------|--------|------|
| App | [Vercel](https://vercel.com) | Hobby (free) |
| Database | [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) | M0 free cluster |
| Domain | `saar.to` | Registrar DNS → Vercel |

This is the default free stack for a personal Next.js App Router app with MongoDB and a custom domain. Alternatives (Railway, Render, Fly, self-hosted VPS) add ops cost without a clear benefit at this scale.

## Why this stack

- Vercel matches Next.js (App Router, server routes, NextAuth, `proxy.ts`).
- Atlas M0 (512 MB) is enough for short links and future click-event history.
- Vercel request geo headers (`x-vercel-ip-country`, region, city) feed planned click analytics.
- Custom domain HTTPS is automatic once DNS points at Vercel.

## Environment variables (production)

Set these in the Vercel project → Settings → Environment Variables (Production):

| Variable | Production value |
|----------|------------------|
| `MONGODB_URI` | Atlas connection string (`mongodb+srv://…`) |
| `NEXT_PUBLIC_BASE_URL` | `https://saar.to` |
| `NEXTAUTH_URL` | `https://saar.to` |
| `NEXTAUTH_SECRET` | Long random secret (`openssl rand -base64 32`) |

Local `.env.local` may use `NEXTAUTH_URL=http://localhost:3000` and a local or Atlas URI. Never commit secrets.

## Atlas checklist

1. Create a free **M0** cluster (region near you or near Vercel).
2. Create a database user with a strong password.
3. Network Access: allow `0.0.0.0/0` for Hobby deploys, or restrict later.
4. Database name can be `url-shortener` (or any name in the URI path).
5. Copy the `mongodb+srv://…` URI into Vercel as `MONGODB_URI`.

## Vercel checklist

1. Import this GitHub repo into a Vercel project (Framework: Next.js).
2. Set the four env vars above for Production (and Preview if you want preview logins).
3. Deploy from `main` (or your default branch).
4. Project → Domains → add `saar.to` (and `www` if you want a redirect).
5. At the registrar, add the DNS records Vercel shows (usually A/ALIAS/CNAME).
6. Confirm `https://saar.to` loads and `/login` works against Atlas.

## Smoke test after first deploy

1. Open `https://saar.to/login` (or `/register` while public signup still exists).
2. Create or sign in to an account.
3. Create a short link; confirm `https://saar.to/{code}` redirects.
4. Confirm the link appears on the dashboard and stats page.

## Local vs production

| | Local | Production |
|--|-------|------------|
| App | `npm run dev` → `http://localhost:3000` | Vercel → `https://saar.to` |
| DB | Local Mongo or Atlas | Atlas M0 |
| `NEXTAUTH_URL` | `http://localhost:3000` | `https://saar.to` |
| Short links | Prefer `NEXT_PUBLIC_BASE_URL=https://saar.to` even locally if you want copied URLs to be production-shaped | `https://saar.to` |

## Related product work (not required to host)

Owner-only invites and richer click events are specified in
`docs/superpowers/specs/2026-08-16-owner-invites-click-analytics-design.md`.
Ship hosting first; close public signup and deepen analytics when that plan is implemented.

## Ops notes

- Redeploy after env changes (or use Vercel’s “Redeploy”).
- Atlas free tier pauses idle clusters rarely on M0; if the first request is slow after idle, that is normal cold start + DB connect.
- Rotate `NEXTAUTH_SECRET` only if compromised (all sessions invalidate).
