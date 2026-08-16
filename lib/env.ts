/** Point NextAuth at the current Vercel deployment when NEXTAUTH_URL is unset (preview). */
export function ensureAuthUrl() {
  if (process.env.NEXTAUTH_URL || !process.env.VERCEL_URL) {
    return;
  }

  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
}

ensureAuthUrl();
