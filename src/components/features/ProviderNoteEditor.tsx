"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveProviderNote } from "@/app/[locale]/(dashboard)/actions";

interface ProviderNoteEditorProps {
  appointmentId: string;
  initialNote: string | null;
  locale: string;
}

export function ProviderNoteEditor({
  appointmentId,
  initialNote,
  locale,
}: ProviderNoteEditorProps) {
  const t = useTranslations("dashboard.calendar.notes");
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState(initialNote ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(formData: FormData) {
    setSaved(false);
    setError("");
    formData.set("appointmentId", appointmentId);
    formData.set("providerNote", note);
    formData.set("locale", locale);

    startTransition(async () => {
      const result = await saveProviderNote(formData);
      if ("success" in result) {
        setSaved(true);
      } else {
        setError(t("saveFailed"));
      }
    });
  }

  return (
    <form action={handleSubmit} className="mt-3 space-y-2">
      <label
        htmlFor={`provider-note-${appointmentId}`}
        className="text-xs font-medium text-muted-foreground"
      >
        {t("label")}
      </label>
      <Textarea
        id={`provider-note-${appointmentId}`}
        value={note}
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
        placeholder={t("placeholder")}
        maxLength={1000}
        rows={2}
        className="resize-none text-sm"
        disabled={isPending}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" variant="outline" disabled={isPending}>
          {t("saveButton")}
        </Button>
        {saved && (
          <span className="text-xs text-green-600">{t("savedFeedback")}</span>
        )}
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>
    </form>
  );
}
