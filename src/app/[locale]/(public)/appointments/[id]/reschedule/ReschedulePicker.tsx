"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface TimeSlotData {
  startTime: string;
  endTime: string;
}

interface ReschedulePickerProps {
  appointmentId: string;
  dates: Array<{ date: string; label: string; dayLabel: string }>;
  slotsByDate: Record<string, TimeSlotData[]>;
  locale: string;
  rescheduleAction: (formData: FormData) => Promise<{ error?: string; success?: true }>;
  labels: {
    noSlots: string;
    confirmButton: string;
    selectSlotFirst: string;
    errorMessages: Record<string, string>;
    successMessage: string;
  };
}

export function ReschedulePicker({
  appointmentId,
  dates,
  slotsByDate,
  locale,
  rescheduleAction,
  labels,
}: ReschedulePickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(dates[0]?.date ?? "");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);

  const slots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  function formatSlotTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString(locale === "de" ? "de-DE" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function handleDateSelect(date: string) {
    setSelectedDate(date);
    setSelectedSlot(null);
    setErrorKey(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedSlot) {
      setErrorKey("selectSlotFirst");
      return;
    }

    setErrorKey(null);

    const formData = new FormData();
    formData.set("appointmentId", appointmentId);
    formData.set("newStartTime", selectedSlot);
    formData.set("locale", locale);

    startTransition(async () => {
      const result = await rescheduleAction(formData);
      if (result.success) {
        setSucceeded(true);
      } else {
        setErrorKey(result.error ?? "unknown");
      }
    });
  }

  if (succeeded) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          {labels.successMessage}
        </p>
        <Link
          href={`/${locale}/appointments`}
          className="text-sm text-primary hover:underline"
        >
          ← {locale === "de" ? "Zurück zu meinen Terminen" : "Back to my appointments"}
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date buttons */}
      <div className="flex flex-wrap gap-2">
        {dates.map(({ date, label, dayLabel }) => (
          <button
            key={date}
            type="button"
            onClick={() => handleDateSelect(date)}
            className={[
              "flex flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors",
              "hover:border-primary hover:bg-primary/5",
              selectedDate === date
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background",
            ].join(" ")}
          >
            <span className="font-medium">{dayLabel}</span>
            <span className="text-xs opacity-80">{label}</span>
          </button>
        ))}
      </div>

      {/* Time slots */}
      {selectedDate && (
        <div>
          {slots.length === 0 ? (
            <p className="text-muted-foreground text-sm">{labels.noSlots}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.startTime}
                  type="button"
                  onClick={() => {
                    setSelectedSlot(slot.startTime);
                    setErrorKey(null);
                  }}
                  className={[
                    "rounded-md border px-3 py-1.5 text-sm transition-colors",
                    "hover:border-primary hover:bg-primary/5",
                    selectedSlot === slot.startTime
                      ? "border-primary bg-primary text-primary-foreground font-medium"
                      : "border-border bg-background",
                  ].join(" ")}
                >
                  {formatSlotTime(slot.startTime)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {errorKey && (
        <p className="text-sm text-destructive">
          {errorKey === "selectSlotFirst"
            ? labels.selectSlotFirst
            : (labels.errorMessages[errorKey] ?? labels.errorMessages["unknown"] ?? errorKey)}
        </p>
      )}

      {/* Confirm button */}
      <Button
        type="submit"
        disabled={isPending || !selectedSlot}
        className="w-full sm:w-auto"
      >
        {isPending
          ? (locale === "de" ? "Wird umgebucht…" : "Rescheduling…")
          : labels.confirmButton}
      </Button>
    </form>
  );
}
