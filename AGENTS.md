## Learned User Preferences

- Prefer a Next.js App Router stack with TanStack (Form, Query, Table) and shadcn/ui when modernizing this shortener.
- Require authenticated multi-user support; treat this as a personal shortener, not an open public signup product.
- Keep the dashboard as the home experience: link statistics with search/status filters, create links in a modal, and empty states that prompt creating a link.
- Match saar.fyi brand styling: dark violet-black surfaces with gold accent `#F9D026` (exact), and keep the product branded as saar.to.
- Prioritize rich click/visit analytics (per-hit detail, uniques, bot filtering) over minimal click counters alone.

## Learned Workspace Facts

- Product domain is `saar.to`; this repo is the personal URL shortener (Next.js + MongoDB/Mongoose + NextAuth).
- Production stack decision: Vercel Hobby for the app, MongoDB Atlas M0 for the database; details live in `docs/production.md`.
- Local auth uses `NEXTAUTH_URL=http://localhost:3000`; production uses `https://saar.to` (never commit `.env.local` or secrets).
- Owner-invite access and ClickEvent analytics are specified in `docs/superpowers/specs/2026-08-16-owner-invites-click-analytics-design.md` and are not required for the first production deploy.
- Owners are bootstrapped only via CLI (`npm run create-user`); public registration is invite-only for members; owners see all links/clicks, members only their own.

## Cursor Cloud specific instructions

Standard commands live in `README.md` / `package.json` scripts (`npm run dev`, `npm run build`, `npm run lint`, `npm run create-user`). Notes below are the non-obvious bits for running this app in the Cloud VM.

- Services: this is a single Next.js app plus a local MongoDB. Both must be up to exercise the product end to end.
- MongoDB: MongoDB Community 8.0 is preinstalled in the VM image, but is not started automatically. Start it before running the app or `create-user`:
  `sudo mongod --dbpath /var/lib/mongodb --logpath /var/log/mongodb/mongod.log --bind_ip 127.0.0.1` (run it in a background/tmux session). Confirm with `mongosh --quiet --eval "db.runCommand({ ping: 1 })"`.
- `.env.local` is git-ignored (never commit it) and is required for `npm run dev` and `npm run create-user`. If it is missing, recreate it with:
  `MONGODB_URI=mongodb://127.0.0.1:27017/url-shortener`, `NEXT_PUBLIC_BASE_URL=http://localhost:3000`, `NEXTAUTH_URL=http://localhost:3000`, and a `NEXTAUTH_SECRET` from `openssl rand -base64 32`. Use `NEXT_PUBLIC_BASE_URL=http://localhost:3000` locally so copied/redirect short links point at localhost, not `https://saar.to`.
- Auth is invite-only: there is no public signup. Bootstrap a login with `npm run create-user -- --name "Saar" --email owner@saar.to --password 'devpassword123'`, then sign in at `/login`.
- End-to-end sanity check: create a link in the dashboard modal, then `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/<slug>` should return `307` with the destination as `redirect_url`.
- `next dev` rewrites the `nextjs-agent-rules` block at the bottom of this file on every run; that uncommitted change is expected and harmless (committing it keeps the tree clean).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
