"use client";

import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createUrl, updateUrl } from "@/lib/api";
import { toDatetimeLocalValue } from "@/lib/format";
import { upsertUrlInCache } from "@/lib/query";
import type { ShortUrlDto } from "@/lib/types";
import {
  createUrlSchema,
  editUrlSchema,
  formatFormError,
  isReservedSlug,
} from "@/lib/validations/url";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const apexHost =
  typeof window !== "undefined"
    ? (() => {
        try {
          return (
            process.env.NEXT_PUBLIC_BASE_URL
              ? new URL(process.env.NEXT_PUBLIC_BASE_URL).hostname.replace(
                  /^www\./i,
                  ""
                )
              : "saar.to"
          );
        } catch {
          return "saar.to";
        }
      })()
    : "saar.to";

export function UrlForm({
  onSaved,
  isOwner = false,
  url,
}: {
  onSaved?: () => void;
  isOwner?: boolean;
  /** When provided, the form edits this link instead of creating a new one. */
  url?: ShortUrlDto;
}) {
  const isEdit = Boolean(url);
  const queryClient = useQueryClient();
  const schema = isEdit ? editUrlSchema : createUrlSchema;

  const mutation = useMutation({
    mutationFn: async (value: {
      fullUrl: string;
      slug: string;
      expiresAt: string;
      kind: "path" | "subdomain";
    }) => {
      if (url) {
        return updateUrl(url.id, {
          fullUrl: value.fullUrl,
          slug: value.slug,
          expiresAt: value.expiresAt,
        });
      }
      return createUrl({
        fullUrl: value.fullUrl,
        slug: value.slug,
        expiresAt: value.expiresAt,
        kind: value.kind,
      });
    },
    onSuccess: (saved) => {
      const description = saved.domainWarning
        ? `${saved.shortUrl} · ${saved.domainWarning}`
        : saved.shortUrl;
      if (isEdit) {
        toast.success("Link updated", { description });
      } else if (saved.kind === "subdomain") {
        toast.success("Premium link created", { description });
      } else {
        toast.success("Short URL created", { description });
      }
      upsertUrlInCache(queryClient, saved);
      onSaved?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      fullUrl: url?.full ?? "",
      slug: url?.short ?? "",
      expiresAt: url ? toDatetimeLocalValue(url.expiresAt) : "",
      kind: url?.kind ?? ("path" as "path" | "subdomain"),
    },
    validators: {
      onSubmit: schema,
    },
    onSubmit: async ({ value }) => {
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        return;
      }

      await mutation.mutateAsync({
        fullUrl: parsed.data.fullUrl,
        slug: parsed.data.slug ?? "",
        expiresAt: parsed.data.expiresAt ?? "",
        kind: parsed.data.kind,
      });

      if (!isEdit) {
        form.reset();
      }
    },
  });

  const kind = useStore(form.store, (state) => state.values.kind);
  const slug = useStore(form.store, (state) => state.values.slug);
  const isPremium = kind === "subdomain";
  const trimmedSlug = slug.trim();
  const previewSlug = trimmedSlug.toLowerCase() || "your-subdomain";
  const pathPreviewSlug = trimmedSlug || "your-slug";
  // Proactive hint so a reserved path is flagged before submitting.
  const reservedHint =
    trimmedSlug !== "" && isReservedSlug(trimmedSlug)
      ? `This ${isPremium ? "subdomain" : "slug"} is reserved`
      : undefined;

  // Only owners may toggle premium, and only when creating (kind is immutable on edit).
  const showPremiumToggle = isOwner && !isEdit;

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      {showPremiumToggle ? (
        <form.Field name="kind">
          {(field) => (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 px-3 py-3">
              <div className="space-y-1">
                <Label htmlFor="premium-toggle" className="text-sm">
                  Premium subdomain
                </Label>
                <p className="text-xs text-muted-foreground">
                  Owner only · {previewSlug}.{apexHost}
                </p>
              </div>
              <button
                id="premium-toggle"
                type="button"
                role="switch"
                aria-checked={field.state.value === "subdomain"}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  field.state.value === "subdomain"
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                }`}
                onClick={() => {
                  const next =
                    field.state.value === "subdomain" ? "path" : "subdomain";
                  field.handleChange(next);
                }}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform ${
                    field.state.value === "subdomain"
                      ? "translate-x-5"
                      : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
        </form.Field>
      ) : null}

      <form.Field name="fullUrl">
        {(field) => (
          <FormField
            label="Destination URL"
            htmlFor={field.name}
            requirement="Required"
            hint="https://example.com/very/long/path"
            error={
              field.state.meta.errors[0]
                ? formatFormError(field.state.meta.errors[0])
                : undefined
            }
          >
            <Input
              id={field.name}
              name={field.name}
              type="url"
              required
              placeholder="https://example.com/very/long/path"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={field.state.meta.errors.length > 0}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="slug">
        {(field) => (
          <FormField
            label={isPremium ? "Subdomain" : "Custom slug"}
            htmlFor={field.name}
            requirement={isPremium ? "Required" : "Optional"}
            hint={
              isPremium
                ? `Required · https://${previewSlug}.${apexHost}`
                : isEdit
                  ? `${apexHost}/${pathPreviewSlug}`
                  : `Optional · ${apexHost}/${pathPreviewSlug}`
            }
            error={
              field.state.meta.errors[0]
                ? formatFormError(field.state.meta.errors[0])
                : reservedHint
            }
          >
            <Input
              id={field.name}
              name={field.name}
              placeholder={isPremium ? "resume" : "my-link"}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={
                field.state.meta.errors.length > 0 || Boolean(reservedHint)
              }
              required={isPremium || isEdit}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="expiresAt">
        {(field) => (
          <FormField
            label="Expires"
            htmlFor={field.name}
            requirement="Optional"
            error={
              field.state.meta.errors[0]
                ? formatFormError(field.state.meta.errors[0])
                : undefined
            }
          >
            <Input
              id={field.name}
              name={field.name}
              type="datetime-local"
              className="min-w-0"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={field.state.meta.errors.length > 0}
            />
          </FormField>
        )}
      </form.Field>

      <Button
        type="submit"
        className="h-10 w-full rounded-full shadow-[0_0_24px_rgb(249_208_38/0.25)]"
        disabled={mutation.isPending}
      >
        {mutation.isPending
          ? isEdit
            ? "Saving…"
            : "Creating…"
          : isEdit
            ? "Save changes"
            : isPremium
              ? "Create premium link"
              : "Shorten URL"}
      </Button>
    </form>
  );
}
