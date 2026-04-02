"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitReview } from "@/app/[locale]/(public)/appointments/actions";

interface ReviewFormProps {
  appointmentId: string;
  locale: string;
}

export function ReviewForm({ appointmentId, locale }: ReviewFormProps) {
  const t = useTranslations("appointments.review");
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState<number>(0);
  const [hovered, setHovered] = useState<number>(0);
  const [result, setResult] = useState<{ error?: string; success?: true } | null>(null);

  function handleSubmit(formData: FormData) {
    if (rating === 0) return;
    formData.set("rating", String(rating));
    formData.set("appointmentId", appointmentId);
    formData.set("locale", locale);

    startTransition(async () => {
      const res = await submitReview(formData);
      setResult(res);
    });
  }

  if (result && "success" in result) {
    return (
      <div className="mt-4 rounded-md bg-green-50 px-4 py-3 text-sm text-green-800 border border-green-200">
        {t("thankYou")}
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="mt-4 space-y-3">
      <p className="text-sm font-medium">{t("title")}</p>

      <div>
        <span className="sr-only">{t("ratingLabel")}</span>
        <div className="flex gap-1" role="group" aria-label={t("ratingLabel")}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              aria-label={`${star} ${t("ratingLabel")}`}
              aria-pressed={rating >= star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="text-2xl leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              style={{ color: (hovered || rating) >= star ? "#f59e0b" : "#d1d5db" }}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor={`comment-${appointmentId}`} className="sr-only">
          {t("commentLabel")}
        </label>
        <Textarea
          id={`comment-${appointmentId}`}
          name="comment"
          placeholder={t("commentPlaceholder")}
          maxLength={500}
          rows={3}
          className="resize-none text-sm"
        />
      </div>

      {result && "error" in result && result.error && (
        <p className="text-sm text-destructive">
          {t(`errors.${result.error}` as Parameters<typeof t>[0])}
        </p>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={isPending || rating === 0}
      >
        {t("submitButton")}
      </Button>
    </form>
  );
}
