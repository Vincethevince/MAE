"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface TimeSlotData {
  startTime: string; // ISO string
  endTime: string;   // ISO string
}

interface DateTimePickerProps {
  dates: Array<{ date: string; label: string; dayLabel: string }>;
  slotsByDate: Record<string, TimeSlotData[]>;
  locale: string;
  providerId: string;
  serviceId: string;
  labels: {
    noSlots: string;
    selectDate: string;
  };
}

export function DateTimePicker({
  dates,
  slotsByDate,
  locale,
  providerId,
  serviceId,
  labels,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(dates[0]?.date ?? "");

  const slots = selectedDate ? (slotsByDate[selectedDate] ?? []) : [];

  function formatSlotTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString(locale === "de" ? "de-DE" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  return (
    <div className="space-y-6">
      {/* Date buttons */}
      <div className="flex flex-wrap gap-2">
        {dates.map(({ date, label, dayLabel }) => (
          <button
            key={date}
            type="button"
            onClick={() => setSelectedDate(date)}
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
                <Link
                  key={slot.startTime}
                  href={`/${locale}/book/${providerId}/${serviceId}/confirm?startTime=${encodeURIComponent(slot.startTime)}`}
                >
                  <Button variant="outline" size="sm">
                    {formatSlotTime(slot.startTime)}
                  </Button>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
