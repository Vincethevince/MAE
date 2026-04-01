"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";

import {
  createOrUpdateProvider,
  addService,
  setAvailability,
} from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const DAYS_OF_WEEK = [1, 2, 3, 4, 5]; // Mon-Fri default

type Step = 1 | 2 | 3;

export function OnboardingForm() {
  const t = useTranslations("onboarding");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();

  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleStep1 = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await createOrUpdateProvider(formData);
      if ("error" in result && result.error) {
        setError(t(`errors.${result.error}`) || t("errors.saveFailed"));
      } else {
        setStep(2);
      }
    });
  };

  const handleStep2 = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      const result = await addService(formData);
      if ("error" in result && result.error) {
        setError(t(`errors.${result.error}`) || t("errors.saveFailed"));
      } else {
        setStep(3);
      }
    });
  };

  const handleStep3 = (formData: FormData) => {
    setError(null);
    const promises = DAYS_OF_WEEK.map((day) => {
      const startTime = formData.get(`startTime_${day}`)?.toString() ?? "";
      const endTime = formData.get(`endTime_${day}`)?.toString() ?? "";
      if (!startTime || !endTime) return Promise.resolve({ success: true });

      const fd = new FormData();
      fd.set("dayOfWeek", String(day));
      fd.set("startTime", startTime);
      fd.set("endTime", endTime);
      return setAvailability(fd);
    });

    startTransition(async () => {
      const results = await Promise.all(promises);
      const failed = results.find((r) => "error" in r && r.error);
      if (failed && "error" in failed) {
        setError(t(`errors.${failed.error}`) || t("errors.saveFailed"));
      } else {
        router.push(`/${locale}/dashboard`);
        router.refresh();
      }
    });
  };

  const stepTitles: Record<Step, string> = {
    1: t("step1.title"),
    2: t("step2.title"),
    3: t("step3.title"),
  };

  const stepDescriptions: Record<Step, string> = {
    1: t("step1.description"),
    2: t("step2.description"),
    3: t("step3.description"),
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                s < step
                  ? "bg-primary text-primary-foreground"
                  : s === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-16 ${s < step ? "bg-primary" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{stepTitles[step]}</CardTitle>
          <CardDescription>{stepDescriptions[step]}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {step === 1 && (
            <form action={handleStep1} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="businessName">{t("fields.businessName")}</Label>
                <Input
                  id="businessName"
                  name="businessName"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">{t("fields.category")}</Label>
                <Input
                  id="category"
                  name="category"
                  required
                  placeholder={t("fields.categoryPlaceholder")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">{t("fields.address")}</Label>
                <Input id="address" name="address" required minLength={5} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="postalCode">{t("fields.postalCode")}</Label>
                  <Input
                    id="postalCode"
                    name="postalCode"
                    required
                    pattern="\d{5}"
                    maxLength={5}
                    placeholder="12345"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city">{t("fields.city")}</Label>
                  <Input id="city" name="city" required minLength={2} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">{t("fields.phone")}</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+49 30 12345678"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">{t("fields.description")}</Label>
                <Textarea
                  id="description"
                  name="description"
                  maxLength={500}
                  rows={3}
                />
              </div>
              <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? tCommon("loading") : tCommon("next")}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form action={handleStep2} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">{t("fields.serviceName")}</Label>
                <Input id="name" name="name" required minLength={2} maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serviceCategory">{t("fields.category")}</Label>
                <Input
                  id="serviceCategory"
                  name="category"
                  required
                  placeholder={t("fields.categoryPlaceholder")}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="durationMinutes">
                    {t("fields.durationMinutes")}
                  </Label>
                  <Input
                    id="durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min={5}
                    max={480}
                    defaultValue={60}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="priceCents">{t("fields.priceEur")}</Label>
                  <Input
                    id="priceCents"
                    name="priceCents"
                    type="number"
                    min={0}
                    step={1}
                    defaultValue={0}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("fields.priceHint")}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="serviceDescription">
                  {t("fields.description")}
                </Label>
                <Textarea
                  id="serviceDescription"
                  name="description"
                  maxLength={300}
                  rows={2}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                >
                  {tCommon("back")}
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? tCommon("loading") : tCommon("next")}
                </Button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form action={handleStep3} className="space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                {t("step3.hint")}
              </p>
              {DAYS_OF_WEEK.map((day) => (
                <div key={day} className="flex items-center gap-4">
                  <span className="w-24 text-sm font-medium shrink-0">
                    {t(`days.${day}`)}
                  </span>
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      name={`startTime_${day}`}
                      type="time"
                      defaultValue="09:00"
                      className="flex-1"
                    />
                    <span className="text-muted-foreground text-sm">–</span>
                    <Input
                      name={`endTime_${day}`}
                      type="time"
                      defaultValue="18:00"
                      className="flex-1"
                    />
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  disabled={isPending}
                >
                  {tCommon("back")}
                </Button>
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? tCommon("loading") : t("completeOnboarding")}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
