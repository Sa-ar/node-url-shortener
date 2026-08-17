# saar.to

A URL shortener at [saar.to](https://saar.to), built with Next.js, MongoDB, TanStack Query/Form/Table, and shadcn/ui. The UI follows the saar.fyi brand: gold on deep violet-black. Each account only sees and manages its own links. Short-link redirects stay public.

## Features

- Invite-only accounts (owner bootstrapped via CLI; members register with a one-time link)
- Email/password sign in and sign out
- Filtered dashboard with link, click, active, and expired totals
- Create a short link from a modal (`http://` or `https://` URL, optional slug and expiry)
- Empty state on the links list that suggests creating a new link
- Click counts, last access, and a 14-day stats view
- Copy, inspect, or delete links from the home table
- Missing or expired codes return a 404

## Stack

- Next.js App Router, React, TypeScript, Tailwind CSS
- NextAuth credentials sessions
- shadcn/ui
- TanStack Query, Form, and Table
- MongoDB with Mongoose
- nanoid for generated codes

## Hosting (production)

| Layer | Choice |
|-------|--------|
| App | Vercel Hobby |
| Database | MongoDB Atlas M0 |
| Domain | `saar.to` → Vercel DNS |

Full checklist: [docs/production.md](docs/production.md).

## Prerequisites

- Node.js 20+
- A MongoDB instance (local for development, Atlas for production)

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | MongoDB connection string (local or Atlas) |
| `NEXT_PUBLIC_BASE_URL` | Public origin for short links (`https://saar.to`) |
| `NEXTAUTH_URL` | App origin (`http://localhost:3000` locally, `https://saar.to` in production) |
| `NEXTAUTH_SECRET` | Random secret used to sign sessions |

Generate a secret with `openssl rand -base64 32`.

### First owner account

Public `/register` is closed. Create the owner with:

```bash
# local Mongo (.env.local)
npm run create-user -- --name "Saar" --email you@example.com --password 'your-password'

# production Atlas (.env.prod from Vercel)
npm run env:pull-prod
npm run create-user -- --name "Saar" --email you@example.com --password 'your-password' --target production
```

Then sign in at `/login` (or `https://saar.to/login` for production). From the dashboard, use **Invite** to copy a one-time link (`/register?invite=…`, expires in 7 days).

## Scripts

```bash
npm run dev          # development server at http://localhost:3000
npm run build        # production build
npm start            # serve the production build
npm run lint         # ESLint
npm run create-user     # create an owner account (see above)
npm run env:pull-prod   # write Vercel production env to .env.prod
```

Open `/login` to sign in. Invitees open the invite URL you share.

## Routes

| Path | Role |
|------|------|
| `/login` | Sign in |
| `/register?invite=…` | Create a member account (invite required) |
| `/` | Dashboard: filtered stats, your short URLs, and a create-link modal |
| `/stats/[code]` | Stats for a link you own (owner: any link) |
| `/[code]` | Public redirect; 404 if missing or expired |
| `POST /api/register` | Create a member (requires valid invite) |
| `GET`/`POST` `/api/invites` | Owner: list or create invites |
| `DELETE /api/invites/[id]` | Owner: revoke an invite |
| `GET /api/urls` | List the signed-in user's URLs |
| `POST /api/urls` | Create a short URL (`fullUrl`, optional `slug`, optional `expiresAt`) |
| `GET /api/urls/[id]` | Fetch one owned URL by Mongo id or short code |
| `DELETE /api/urls/[id]` | Delete an owned short URL |

Visiting `https://saar.to/abc1234` increments the click count (and a UTC daily bucket) and then redirects. You do not need to be signed in to follow a short link.
