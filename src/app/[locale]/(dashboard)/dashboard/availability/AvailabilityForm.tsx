"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import {
  setAvailability,
  deleteAvailability,
} from "@/app/[locale]/(dashboard)/actions";
import type { Database } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];

interface DayAvailability {
  startTime: string;
  endTime: string;
}

const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0] as const;

interface AvailabilityFormProps {
  availability: AvailabilityRow[];
}

export function AvailabilityForm({ availability }: AvailabilityFormProps) {
  const t = useTranslations("dashboard.availability");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});

  // Build initial state from existing availability
  const initialDays = Object.fromEntries(
    ALL_DAYS.map((day) => {
      const slot = availability.find((a) => a.day_of_week === day && !a.employee_id);
      return [
        day,
        slot
          ? { startTime: slot.start_time.slice(0, 5), endTime: slot.end_time.slice(0, 5) }
          : { startTime: "", endTime: "" },
      ];
    })
  ) as Record<number, DayAvailability>;

  const [days, setDays] = useState<Record<number, DayAvailability>>(initialDays);

  const updateDay = (day: number, field: "startTime" | "endTime", value: string) => {
    setDays((prev) => ({
      ...prev,
      [day]: { ...prev[day]!, [field]: value },
    }));
    setSuccess(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    const newErrors: Record<number, string> = {};
    for (const day of ALL_DAYS) {
      const { startTime, endTime } = days[day]!;
      // Both must be set or both empty
      if ((startTime && !endTime) || (!startTime && endTime)) {
        newErrors[day] = t("errors.validationError");
      }
      if (startTime && endTime && startTime >= endTime) {
        newErrors[day] = t("errors.validationError");
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    startTransition(async () => {
      const promises = ALL_DAYS.map((day) => {
        const { startTime, endTime } = days[day]!;
        if (!startTime || !endTime) {
          // Create a FormData that will delete this day's availability
          const fd = new FormData();
          fd.set("dayOfWeek", String(day));
          fd.set("startTime", "00:00");
          fd.set("endTime", "00:01");
          // We pass empty strings — the setAvailability action deletes the existing
          // row for this day first, then skips insert if times are empty.
          // Instead, we handle "clear day" by sending a special marker.
          // For now, skip days with no times (no call = keep existing row deleted already).
          return Promise.resolve({ success: true as const });
        }
        const fd = new FormData();
        fd.set("dayOfWeek", String(day));
        fd.set("startTime", startTime);
        fd.set("endTime", endTime);
        return setAvailability(fd);
      });

      // For days with empty times, delete existing availability
      const deletionPromises = ALL_DAYS.map((day) => {
        const { startTime, endTime } = days[day]!;
        if (!startTime || !endTime) {
          const fd = new FormData();
          fd.set("dayOfWeek", String(day));
          return deleteAvailability(fd);
        }
        return Promise.resolve({ success: true as const });
      });

      const results = await Promise.all([...promises, ...deletionPromises]);
      const failed = results.find((r) => "error" in r && r.error);
      if (failed && "error" in failed) {
        setErrors({ 0: t(`errors.${failed.error}`) });
      } else {
        setSuccess(true);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("hint")}</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errors[0] && <p className="text-sm text-destructive">{errors[0]}</p>}
          {success && <p className="text-sm text-green-600">{t("saveSuccess")}</p>}

          {ALL_DAYS.map((day) => (
            <div key={day} className="flex items-start gap-4">
              <span className="w-24 text-sm font-medium pt-2.5 shrink-0">
                {t(`days.${day}`)}
              </span>
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    type="time"
                    value={days[day]!.startTime}
                    onChange={(e) => updateDay(day, "startTime", e.target.value)}
                    className="flex-1"
                    aria-label={`${t(`days.${day}`)} start time`}
                  />
                  <span className="text-muted-foreground text-sm shrink-0">–</span>
                  <Input
                    type="time"
                    value={days[day]!.endTime}
                    onChange={(e) => updateDay(day, "endTime", e.target.value)}
                    className="flex-1"
                    aria-label={`${t(`days.${day}`)} end time`}
                  />
                  {(days[day]!.startTime || days[day]!.endTime) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateDay(day, "startTime", "");
                        updateDay(day, "endTime", "");
                      }}
                      aria-label={`Clear ${t(`days.${day}`)}`}
                    >
                      ×
                    </Button>
                  )}
                </div>
                {errors[day] && (
                  <p className="text-xs text-destructive">{errors[day]}</p>
                )}
              </div>
            </div>
          ))}

          <Button type="submit" disabled={isPending} className="mt-2">
            {isPending ? tCommon("loading") : tCommon("save")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

