import { z } from "zod";

/**
 * First-path segments the app serves itself (see `proxy.ts` and the `app/`
 * routes). None of these may be claimed as a short-link slug, otherwise the
 * short link would shadow a real page/route.
 */
export const RESERVED_SLUGS = new Set([
  "api",
  "stats",
  "login",
  "register",
  "signin",
  "signup",
  "_next",
  "favicon.ico",
  "robots.txt",
  "sitemap.xml",
  "go",
  "www",
  "app",
  "mail",
  "admin",
  "cdn",
  "vercel",
]);

/** True when the slug collides with a reserved app path (case-insensitive). */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

const slugPattern = /^[a-zA-Z0-9_-]+$/;
/** DNS labels: letters, digits, hyphens; no underscores. */
const subdomainLabelPattern = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/i;

type SlugKind = "path" | "subdomain";

/**
 * Validate a slug/subdomain label, adding issues on the `slug` path.
 * Reserved paths are rejected first so the user gets the clearest reason.
 * When `required` is false an empty path slug is allowed (auto-generated);
 * subdomains are always required.
 */
function addSlugIssues(
  rawSlug: string,
  kind: SlugKind,
  ctx: z.RefinementCtx,
  required: boolean
) {
  const slug = rawSlug.trim();
  const noun = kind === "subdomain" ? "Subdomain" : "Slug";

  if (slug === "") {
    if (required || kind === "subdomain") {
      ctx.addIssue({
        code: "custom",
        message: `${noun} is required`,
        path: ["slug"],
      });
    }
    return;
  }

  if (isReservedSlug(slug)) {
    ctx.addIssue({
      code: "custom",
      message: `This ${noun.toLowerCase()} is reserved`,
      path: ["slug"],
    });
    return;
  }

  if (slug.length < 3 || slug.length > 32) {
    ctx.addIssue({
      code: "custom",
      message: `${noun} must be 3–32 characters`,
      path: ["slug"],
    });
    return;
  }

  const pattern = kind === "subdomain" ? subdomainLabelPattern : slugPattern;
  if (!pattern.test(slug)) {
    ctx.addIssue({
      code: "custom",
      message:
        kind === "subdomain"
          ? "Use letters, numbers, or hyphens"
          : "Use letters, numbers, underscores, or hyphens",
      path: ["slug"],
    });
  }
}

function addExpiryIssues(rawExpiresAt: string, ctx: z.RefinementCtx) {
  const expiresAt = rawExpiresAt.trim();
  if (expiresAt === "") {
    return;
  }

  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) {
    ctx.addIssue({
      code: "custom",
      message: "Enter a valid date",
      path: ["expiresAt"],
    });
  } else if (date.getTime() <= Date.now()) {
    ctx.addIssue({
      code: "custom",
      message: "Expiry must be in the future",
      path: ["expiresAt"],
    });
  }
}

const fullUrlField = z
  .string()
  .trim()
  .min(1, "URL is required")
  .superRefine((value, ctx) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        ctx.addIssue({
          code: "custom",
          message: "URL must start with http:// or https://",
        });
      }
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Enter a valid URL",
      });
    }
  });

const baseUrlObject = z.object({
  fullUrl: fullUrlField,
  slug: z.string(),
  expiresAt: z.string(),
  kind: z.enum(["path", "subdomain"]),
});

export const createUrlSchema = baseUrlObject
  .superRefine((data, ctx) => {
    addSlugIssues(data.slug, data.kind, ctx, false);
    addExpiryIssues(data.expiresAt, ctx);
  })
  .transform((data) => {
    const kind = data.kind;
    const slug = data.slug.trim();
    return {
      fullUrl: data.fullUrl,
      slug:
        slug === ""
          ? undefined
          : kind === "subdomain"
            ? slug.toLowerCase()
            : slug,
      expiresAt: data.expiresAt.trim() === "" ? undefined : data.expiresAt.trim(),
      kind,
    };
  });

/**
 * Editing an existing link. A short code always exists, so the slug is
 * required for both path and subdomain links.
 */
export const editUrlSchema = baseUrlObject
  .superRefine((data, ctx) => {
    addSlugIssues(data.slug, data.kind, ctx, true);
    addExpiryIssues(data.expiresAt, ctx);
  })
  .transform((data) => {
    const kind = data.kind;
    const slug = data.slug.trim();
    return {
      fullUrl: data.fullUrl,
      slug: kind === "subdomain" ? slug.toLowerCase() : slug,
      expiresAt: data.expiresAt.trim() === "" ? undefined : data.expiresAt.trim(),
      kind,
    };
  });

export type CreateUrlInput = z.input<typeof createUrlSchema>;
export type CreateUrlValues = z.output<typeof createUrlSchema>;
export type EditUrlInput = z.input<typeof editUrlSchema>;
export type EditUrlValues = z.output<typeof editUrlSchema>;

export function formatFormError(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Invalid value";
}
