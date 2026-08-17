"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { useForm, useStore } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createUrl, updateUrl } from "@/lib/api";
import { toDatetimeLocalValue } from "@/lib/format";
import { upsertUrlInCache } from "@/lib/query";
import type {
  FileDisposition,
  FileSource,
  ShortUrlDto,
  ShortUrlTarget,
} from "@/lib/types";
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

function guessContentType(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "";
}

function fileNameFromUrl(value: string) {
  try {
    const path = new URL(value).pathname;
    const last = path.split("/").filter(Boolean).at(-1);
    return last ? decodeURIComponent(last) : "download";
  } catch {
    return "download";
  }
}

type FormValues = {
  fullUrl: string;
  slug: string;
  expiresAt: string;
  kind: "path" | "subdomain";
  target: ShortUrlTarget;
  disposition: FileDisposition;
  fileName: string;
  contentType: string;
  fileSize: number;
  fileSource: FileSource | "";
  note: string;
  password: string;
  removePassword: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
};

export function UrlForm({
  onSaved,
  isOwner = false,
  url,
}: {
  onSaved?: () => void;
  isOwner?: boolean;
  url?: ShortUrlDto;
}) {
  const isEdit = Boolean(url);
  const queryClient = useQueryClient();
  const schema = isEdit ? editUrlSchema : createUrlSchema;
  const [uploading, setUploading] = useState(false);

  const mutation = useMutation({
    mutationFn: async (value: FormValues) => {
      const payload = {
        fullUrl: value.fullUrl,
        slug: value.slug,
        expiresAt: value.expiresAt,
        kind: value.kind,
        target: value.target,
        disposition: value.disposition,
        fileName: value.fileName,
        contentType: value.contentType,
        fileSize: value.fileSize || undefined,
        fileSource: value.fileSource || undefined,
        note: value.note,
        password: value.password,
        removePassword: value.removePassword,
        ogTitle: value.ogTitle,
        ogDescription: value.ogDescription,
        ogImageUrl: value.ogImageUrl,
      };
      if (url) {
        return updateUrl(url.id, payload);
      }
      return createUrl(payload);
    },
    onSuccess: (saved) => {
      const description = saved.domainWarning
        ? `${saved.shortUrl} · ${saved.domainWarning}`
        : saved.shortUrl;
      if (isEdit) {
        toast.success("Link updated", { description });
      } else if (saved.target === "file") {
        toast.success("File link created", { description });
      } else if (saved.kind === "subdomain") {
        toast.success("Premium link created", { description });
      } else {
        toast.success("Short URL created", { description });
      }
      upsertUrlInCache(queryClient, saved);
      void queryClient.invalidateQueries({ queryKey: ["stats-overview"] });
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
      kind: url?.kind ?? ("path" as const),
      target: url?.target ?? ("url" as ShortUrlTarget),
      disposition: url?.disposition ?? ("inline" as FileDisposition),
      fileName: url?.fileName ?? "",
      contentType: url?.contentType ?? "",
      fileSize: url?.fileSize ?? 0,
      fileSource: url?.fileSource ?? ("" as FileSource | ""),
      note: url?.note ?? "",
      password: "",
      removePassword: false as boolean,
      ogTitle: url?.ogTitle ?? "",
      ogDescription: url?.ogDescription ?? "",
      ogImageUrl: url?.ogImageUrl ?? "",
    } satisfies FormValues,
    onSubmit: async ({ value }) => {
      const parsed = schema.safeParse(value);
      if (!parsed.success) {
        return;
      }
      await mutation.mutateAsync(value);
      if (!isEdit) {
        form.reset();
      }
    },
  });

  const kind = useStore(form.store, (state) => state.values.kind);
  const slug = useStore(form.store, (state) => state.values.slug);
  const target = useStore(form.store, (state) => state.values.target);
  const fileName = useStore(form.store, (state) => state.values.fileName);
  const isPremium = kind === "subdomain";
  const isFile = target === "file";
  const trimmedSlug = slug.trim();
  const previewSlug = trimmedSlug.toLowerCase() || "your-subdomain";
  const pathPreviewSlug = trimmedSlug || "your-slug";
  const reservedHint =
    trimmedSlug !== "" && isReservedSlug(trimmedSlug)
      ? `This ${isPremium ? "subdomain" : "slug"} is reserved`
      : undefined;
  const showPremiumToggle = isOwner && !isEdit;

  const applyExternalFileUrl = (value: string) => {
    form.setFieldValue("fullUrl", value);
    form.setFieldValue("fileSource", "external");
    form.setFieldValue("fileName", fileNameFromUrl(value));
    form.setFieldValue("contentType", guessContentType(fileNameFromUrl(value)));
    form.setFieldValue("fileSize", 0);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        multipart: file.size > 4_000_000,
      });
      form.setFieldValue("fullUrl", blob.url);
      form.setFieldValue("fileName", file.name);
      form.setFieldValue("contentType", file.type || guessContentType(file.name));
      form.setFieldValue("fileSize", file.size);
      form.setFieldValue("fileSource", "blob");
      toast.success("File uploaded", { description: file.name });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Upload failed. Paste an https file URL instead."
      );
    } finally {
      setUploading(false);
    }
  };

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
                  field.handleChange(
                    field.state.value === "subdomain" ? "path" : "subdomain"
                  );
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

      <form.Field name="target">
        {(field) => (
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["url", "URL"],
                ["file", "File"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${
                  field.state.value === value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
                onClick={() => {
                  field.handleChange(value);
                  if (value === "url") {
                    form.setFieldValue("fileSource", "");
                    form.setFieldValue("fileName", "");
                  }
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </form.Field>

      {isFile ? (
        <>
          <div className="grid gap-2 rounded-xl border border-dashed border-border px-3 py-4">
            <Label htmlFor="file-upload" className="text-sm">
              Upload file
            </Label>
            <Input
              id="file-upload"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              disabled={uploading || mutation.isPending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void uploadFile(file);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {fileName
                ? `Selected · ${fileName}`
                : "PDF, images, zip, or Office · 15 MB max. Needs Blob token, or paste a URL below."}
            </p>
          </div>

          <form.Field name="fullUrl">
            {(field) => (
              <FormField
                label="Or paste a file URL"
                htmlFor={field.name}
                requirement="Required"
                hint="https://example.com/resume.pdf"
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
                  placeholder="https://example.com/resume.pdf"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    applyExternalFileUrl(event.target.value);
                  }}
                  aria-invalid={field.state.meta.errors.length > 0}
                />
              </FormField>
            )}
          </form.Field>

          <form.Field name="disposition">
            {(field) => (
              <div className="flex items-start justify-between gap-3 rounded-xl border border-border/80 bg-muted/30 px-3 py-3">
                <div className="space-y-1">
                  <Label htmlFor="download-toggle" className="text-sm">
                    Download instead of opening
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {field.state.value === "attachment"
                      ? "Visitors get a file download"
                      : "Open in the browser when possible"}
                  </p>
                </div>
                <button
                  id="download-toggle"
                  type="button"
                  role="switch"
                  aria-checked={field.state.value === "attachment"}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    field.state.value === "attachment"
                      ? "bg-primary"
                      : "bg-muted-foreground/30"
                  }`}
                  onClick={() => {
                    field.handleChange(
                      field.state.value === "attachment" ? "inline" : "attachment"
                    );
                  }}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-background transition-transform ${
                      field.state.value === "attachment"
                        ? "translate-x-5"
                        : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            )}
          </form.Field>
        </>
      ) : (
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
      )}

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

      <form.Field name="note">
        {(field) => (
          <FormField
            label="Internal note"
            htmlFor={field.name}
            requirement="Optional"
            hint="Only visible in the dashboard"
            error={
              field.state.meta.errors[0]
                ? formatFormError(field.state.meta.errors[0])
                : undefined
            }
          >
            <Input
              id={field.name}
              name={field.name}
              placeholder="Why this link exists"
              maxLength={500}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="ogTitle">
        {(field) => (
          <FormField
            label="OG title"
            htmlFor={field.name}
            requirement="Optional"
            hint="Shown when the link is shared"
          >
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="ogDescription">
        {(field) => (
          <FormField
            label="OG description"
            htmlFor={field.name}
            requirement="Optional"
          >
            <Input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="ogImageUrl">
        {(field) => (
          <FormField
            label="OG image URL"
            htmlFor={field.name}
            requirement="Optional"
            hint="https image for Slack / iMessage unfurls"
          >
            <Input
              id={field.name}
              name={field.name}
              type="url"
              placeholder="https://example.com/card.png"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="password">
        {(field) => (
          <FormField
            label="Password"
            htmlFor={field.name}
            requirement="Optional"
            hint={
              url?.hasPassword
                ? "Leave blank to keep the current password"
                : "Visitors must enter this to open the link"
            }
          >
            <Input
              id={field.name}
              name={field.name}
              type="password"
              autoComplete="new-password"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
            />
          </FormField>
        )}
      </form.Field>

      {url?.hasPassword ? (
        <form.Field name="removePassword">
          {(field) => (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.state.value}
                onChange={(event) => field.handleChange(event.target.checked)}
              />
              Remove password
            </label>
          )}
        </form.Field>
      ) : null}

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
        disabled={mutation.isPending || uploading}
      >
        {uploading
          ? "Uploading…"
          : mutation.isPending
            ? isEdit
              ? "Saving…"
              : "Creating…"
            : isEdit
              ? "Save changes"
              : isFile
                ? "Create file link"
                : isPremium
                  ? "Create premium link"
                  : "Shorten URL"}
      </Button>
    </form>
  );
}
