# saar.to

Personal URL shortener (Next.js + MongoDB). Product domain: https://saar.to

## Deploy Configuration (configured by /setup-deploy)

- Platform: vercel
- Production URL: https://saar.to
- Health check: https://saar.to/login
- Deploy workflow: auto-deploy production on push to master; Preview deploys on other branches / PRs
- Deploy status command: HTTP health check (`curl -sf -o /dev/null -w "%{http_code}" https://saar.to/login`)
- Deploy trigger: automatic on push to master (production) or feature branches (preview)
- Deploy status: poll production URL until HTTP 200; for preview use the branch deployment URL from Vercel
- Database: MongoDB Atlas M0 (`MONGODB_URI`)
- Docs: docs/production.md

## Notes for agents

- Do not commit `.env.local` or secrets.
- Local auth uses `NEXTAUTH_URL=http://localhost:3000`; production uses `https://saar.to`; preview leaves `NEXTAUTH_URL` unset and uses `VERCEL_URL`.
- Owner accounts: `npm run create-user`. Members register via invite only.
