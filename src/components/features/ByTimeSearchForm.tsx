"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROVIDER_CATEGORIES } from "@/lib/validations/provider";

interface ByTimeSearchFormProps {
  locale: string;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  initialCity?: string;
  initialCategory?: string;
}

export function ByTimeSearchForm({
  locale,
  initialDate = "",
  initialStartTime = "",
  initialEndTime = "",
  initialCity = "",
  initialCategory = "",
}: ByTimeSearchFormProps) {
  const router = useRouter();
  const t = useTranslations("search");
  const tBy = useTranslations("search.byTimeSearch");

  const todayStr = new Date().toISOString().split("T")[0] ?? "";

  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [city, setCity] = useState(initialCity);
  const [category, setCategory] = useState(initialCategory);
  const [validationError, setValidationError] = useState("");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setValidationError("");

    // Client-side validation: endTime > startTime
    if (startTime && endTime && endTime <= startTime) {
      setValidationError(tBy("validationError"));
      return;
    }

    const params = new URLSearchParams();
    if (date) params.set("date", date);
    if (startTime) params.set("startTime", startTime);
    if (endTime) params.set("endTime", endTime);
    if (city.trim()) params.set("city", city.trim());
    if (category && category !== "all") params.set("category", category);

    router.push(`/${locale}/search/by-time?${params.toString()}`);
  }

  const TIME_PRESETS = [
    { label: tBy("morning"),   start: "09:00", end: "12:00" },
    { label: tBy("afternoon"), start: "12:00", end: "17:00" },
    { label: tBy("evening"),   start: "17:00", end: "21:00" },
  ] as const;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-4">
        {/* Date + time row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="by-time-date" className="text-sm font-medium">
                {tBy("dateLabel")}
              </Label>
              <button
                type="button"
                onClick={() => setDate(todayStr)}
                className="text-xs text-primary hover:underline font-medium"
              >
                {tBy("todayButton")}
              </button>
            </div>
            <Input
              id="by-time-date"
              type="date"
              min={todayStr}
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="sm:w-36">
            <Label htmlFor="by-time-start" className="block text-sm font-medium mb-1">
              {tBy("startTimeLabel")}
            </Label>
            <Input
              id="by-time-start"
              type="time"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="sm:w-36">
            <Label htmlFor="by-time-end" className="block text-sm font-medium mb-1">
              {tBy("endTimeLabel")}
            </Label>
            <Input
              id="by-time-end"
              type="time"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Quick time presets */}
        <div className="flex gap-2 flex-wrap">
          {TIME_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setStartTime(preset.start);
                setEndTime(preset.end);
              }}
              className={
                startTime === preset.start && endTime === preset.end
                  ? "text-xs px-3 py-1 rounded-full border bg-primary text-primary-foreground font-medium"
                  : "text-xs px-3 py-1 rounded-full border bg-background hover:bg-accent transition-colors"
              }
            >
              {preset.label} ({preset.start}–{preset.end})
            </button>
          ))}
        </div>

        {/* City + category + submit row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 min-w-0">
            <Label htmlFor="by-time-city" className="sr-only">
              {t("cityLabel")}
            </Label>
            <Input
              id="by-time-city"
              type="text"
              placeholder={t("cityLabel")}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </div>

          <div className="sm:w-48">
            <Label htmlFor="by-time-category" className="sr-only">
              {t("categoryLabel")}
            </Label>
            <Select
              value={category || "all"}
              onValueChange={(val) =>
                setCategory(val == null || val === "all" ? "" : val)
              }
            >
              <SelectTrigger id="by-time-category">
                <SelectValue placeholder={t("categoryAll")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("categoryAll")}</SelectItem>
                {PROVIDER_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {t(`categories.${cat}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="submit">{tBy("searchButton")}</Button>
        </div>

        {validationError && (
          <p className="text-sm text-destructive">{validationError}</p>
        )}
      </div>
    </form>
  );
}
