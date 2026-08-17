import { z } from "zod";
import { isAllowedFileType, mustForceAttachment } from "@/lib/files";

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
  target: z.enum(["url", "file"]).default("url"),
  disposition: z.enum(["inline", "attachment"]).optional(),
  fileName: z.string().optional(),
  contentType: z.string().optional(),
  fileSize: z.number().optional(),
  fileSource: z.enum(["blob", "external"]).optional(),
  note: z.string().optional(),
  password: z.string().optional(),
  removePassword: z.boolean().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImageUrl: z.string().optional(),
});

function addFileIssues(
  data: {
    target: "url" | "file";
    fileName?: string;
    contentType?: string;
    fileSource?: "blob" | "external";
    fileSize?: number;
  },
  ctx: z.RefinementCtx
) {
  if (data.target !== "file") {
    return;
  }

  if (!data.fileName?.trim()) {
    ctx.addIssue({
      code: "custom",
      message: "File name is required",
      path: ["fileName"],
    });
  }

  if (data.fileSource !== "blob" && data.fileSource !== "external") {
    ctx.addIssue({
      code: "custom",
      message: "Upload a file or paste an https file URL",
      path: ["fileSource"],
    });
  }

  const contentType = data.contentType?.trim() ?? "";
  if (contentType && !isAllowedFileType(contentType) && mustForceAttachment(contentType)) {
    ctx.addIssue({
      code: "custom",
      message: "That file type is not allowed",
      path: ["contentType"],
    });
  } else if (contentType && !isAllowedFileType(contentType)) {
    ctx.addIssue({
      code: "custom",
      message: "Use a PDF, image, zip, or Office document",
      path: ["contentType"],
    });
  }
}

export const createUrlSchema = baseUrlObject
  .superRefine((data, ctx) => {
    addSlugIssues(data.slug, data.kind, ctx, false);
    addExpiryIssues(data.expiresAt, ctx);
    addFileIssues(data, ctx);
  })
  .transform((data) => {
    const kind = data.kind;
    const slug = data.slug.trim();
    const target = data.target === "file" ? "file" : "url";
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
      target: target === "file" ? ("file" as const) : ("url" as const),
      disposition:
        target === "file"
          ? data.disposition === "attachment"
            ? ("attachment" as const)
            : ("inline" as const)
          : undefined,
      fileName: target === "file" ? data.fileName?.trim() : undefined,
      contentType: target === "file" ? data.contentType?.trim() : undefined,
      fileSize: target === "file" ? data.fileSize : undefined,
      fileSource: target === "file" ? data.fileSource : undefined,
      note: data.note?.trim() ? data.note.trim().slice(0, 500) : undefined,
      password: data.password?.trim() || undefined,
      removePassword: data.removePassword === true,
      ogTitle: data.ogTitle?.trim() || undefined,
      ogDescription: data.ogDescription?.trim() || undefined,
      ogImageUrl: data.ogImageUrl?.trim() || undefined,
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
    addFileIssues(data, ctx);
  })
  .transform((data) => {
    const kind = data.kind;
    const slug = data.slug.trim();
    const target = data.target === "file" ? "file" : "url";
    return {
      fullUrl: data.fullUrl,
      slug: kind === "subdomain" ? slug.toLowerCase() : slug,
      expiresAt: data.expiresAt.trim() === "" ? undefined : data.expiresAt.trim(),
      kind,
      target: target === "file" ? ("file" as const) : ("url" as const),
      disposition:
        target === "file"
          ? data.disposition === "attachment"
            ? ("attachment" as const)
            : ("inline" as const)
          : undefined,
      fileName: target === "file" ? data.fileName?.trim() : undefined,
      contentType: target === "file" ? data.contentType?.trim() : undefined,
      fileSize: target === "file" ? data.fileSize : undefined,
      fileSource: target === "file" ? data.fileSource : undefined,
      note: data.note?.trim() ? data.note.trim().slice(0, 500) : undefined,
      password: data.password?.trim() || undefined,
      removePassword: data.removePassword === true,
      ogTitle: data.ogTitle?.trim() || undefined,
      ogDescription: data.ogDescription?.trim() || undefined,
      ogImageUrl: data.ogImageUrl?.trim() || undefined,
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
