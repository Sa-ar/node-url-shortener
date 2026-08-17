## Learned User Preferences

- Prefer a Next.js App Router stack with TanStack (Form, Query, Table) and shadcn/ui when modernizing this shortener.
- Require authenticated multi-user support; treat this as a personal shortener, not an open public signup product.
- Keep the dashboard as the home experience: link statistics with search/status filters, create links in a modal, and empty states that prompt creating a link.
- Match saar.fyi brand styling: dark violet-black surfaces with gold accent `#F9D026` (exact), and keep the product branded as saar.to.
- Prioritize rich click/visit analytics (per-hit detail, uniques, bot filtering) over minimal click counters alone.
- Prefer explicit loading, error, success, and empty states across dashboard, stats, auth, and invite flows (including route-level loading/error UI).

## Learned Workspace Facts

- Product domain is `saar.to`; this repo is the personal URL shortener (Next.js + MongoDB/Mongoose + NextAuth).
- Production stack decision: Vercel Hobby for the app, MongoDB Atlas M0 for the database; details live in `docs/production.md`.
- Local auth uses `NEXTAUTH_URL=http://localhost:3000`; production uses `https://saar.to`; preview leaves `NEXTAUTH_URL` unset and uses `VERCEL_URL`.
- Production and Preview both need `NEXTAUTH_SECRET` and `MONGODB_URI` on Vercel; never commit `.env.local` or secrets.
- Owner-invite access and ClickEvent analytics are specified in `docs/superpowers/specs/2026-08-16-owner-invites-click-analytics-design.md` and are not required for the first production deploy.
- Owners are bootstrapped only via CLI (`npm run create-user`); public registration is invite-only for members; owners see all links/clicks, members only their own.
- Keep apex `saar.to` as the primary Vercel domain (avoid forcing traffic to `www`).
- Atlas Network Access must allow Vercel egress (commonly `0.0.0.0/0` on M0) or sign-in and short-link redirects fail with server selection errors.
