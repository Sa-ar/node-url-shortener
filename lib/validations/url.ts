import { z } from "zod";

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
]);

export const createUrlSchema = z
  .object({
    fullUrl: z
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
      }),
    slug: z.string(),
    expiresAt: z.string(),
  })
  .superRefine((data, ctx) => {
    const slug = data.slug.trim();
    if (slug !== "") {
      if (slug.length < 3 || slug.length > 32) {
        ctx.addIssue({
          code: "custom",
          message: "Slug must be 3–32 characters",
          path: ["slug"],
        });
      } else if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
        ctx.addIssue({
          code: "custom",
          message: "Use letters, numbers, underscores, or hyphens",
          path: ["slug"],
        });
      } else if (RESERVED_SLUGS.has(slug.toLowerCase())) {
        ctx.addIssue({
          code: "custom",
          message: "This slug is reserved",
          path: ["slug"],
        });
      }
    }

    const expiresAt = data.expiresAt.trim();
    if (expiresAt !== "") {
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
  })
  .transform((data) => ({
    fullUrl: data.fullUrl,
    slug: data.slug.trim() === "" ? undefined : data.slug.trim(),
    expiresAt: data.expiresAt.trim() === "" ? undefined : data.expiresAt.trim(),
  }));

export type CreateUrlInput = z.input<typeof createUrlSchema>;
export type CreateUrlValues = z.output<typeof createUrlSchema>;

export function formatFormError(error: unknown) {
  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }

  return "Invalid value";
}
