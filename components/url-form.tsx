"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createUrl } from "@/lib/api";
import { formatFormError, createUrlSchema } from "@/lib/validations/url";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UrlForm({ onCreated }: { onCreated?: () => void }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createUrl,
    onSuccess: (url) => {
      toast.success("Short URL created", { description: url.shortUrl });
      void queryClient.invalidateQueries({ queryKey: ["urls"] });
      onCreated?.();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const form = useForm({
    defaultValues: {
      fullUrl: "",
      slug: "",
      expiresAt: "",
    },
    validators: {
      onSubmit: createUrlSchema,
    },
    onSubmit: async ({ value }) => {
      const parsed = createUrlSchema.safeParse(value);
      if (!parsed.success) {
        return;
      }

      await mutation.mutateAsync({
        fullUrl: parsed.data.fullUrl,
        slug: parsed.data.slug,
        expiresAt: parsed.data.expiresAt,
      });
      form.reset();
    },
  });

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field name="fullUrl">
        {(field) => (
          <FormField
            label="Destination URL"
            htmlFor={field.name}
            hint="Required"
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
            label="Custom slug"
            htmlFor={field.name}
            hint="Optional · 3–32 chars"
            error={
              field.state.meta.errors[0]
                ? formatFormError(field.state.meta.errors[0])
                : undefined
            }
          >
            <Input
              id={field.name}
              name={field.name}
              placeholder="my-link"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              aria-invalid={field.state.meta.errors.length > 0}
            />
          </FormField>
        )}
      </form.Field>

      <form.Field name="expiresAt">
        {(field) => (
          <FormField
            label="Expires"
            htmlFor={field.name}
            hint="Optional"
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
        {mutation.isPending ? "Creating…" : "Shorten URL"}
      </Button>
    </form>
  );
}
