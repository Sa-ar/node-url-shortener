# saar.to

Personal URL shortener (Next.js + MongoDB). Product domain: https://saar.to

## Deploy Configuration (configured by /setup-deploy)

- Platform: vercel
- Production URL: https://saar.to
- Health check: https://saar.to/login
- Deploy workflow: auto-deploy on push to main (Vercel Git integration)
- Deploy status command: HTTP health check (`curl -sf -o /dev/null -w "%{http_code}" https://saar.to/login`)
- Deploy trigger: automatic on push to main (or Vercel dashboard Redeploy)
- Deploy status: poll production URL until HTTP 200
- Database: MongoDB Atlas M0 (`MONGODB_URI`)
- Docs: docs/production.md

## Notes for agents

- Do not commit `.env.local` or secrets.
- Local auth uses `NEXTAUTH_URL=http://localhost:3000`; production uses `https://saar.to`.
- Owner-invite + click-event analytics are specified in `docs/superpowers/specs/2026-08-16-owner-invites-click-analytics-design.md` and are not required for first production deploy.
