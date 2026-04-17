"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";

import { createOrUpdateProvider, updateProviderSlug, updateWeeklySummaryOptIn } from "@/app/[locale]/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://makeappointmentseasier.com";

interface ProviderData {
  businessName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string | null;
  category: string;
  description: string | null;
  website: string | null;
  slug: string | null;
  weeklySummaryOptIn: boolean;
}

interface SettingsFormProps {
  provider: ProviderData;
}

export function SettingsForm({ provider }: SettingsFormProps) {
  const t = useTranslations("dashboard.settings");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [isSlugPending, startSlugTransition] = useTransition();
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSuccess, setSlugSuccess] = useState(false);
  const [slugValue, setSlugValue] = useState(provider.slug ?? "");

  const [isNotifPending, startNotifTransition] = useTransition();
  const [notifError, setNotifError] = useState<string | null>(null);
  const [notifSuccess, setNotifSuccess] = useState(false);
  const [weeklySummaryOptIn, setWeeklySummaryOptIn] = useState(provider.weeklySummaryOptIn);

  const handleSubmit = (formData: FormData) => {
    // Pass category to satisfy schema validation; the server action ignores it
    // on update and uses the stored DB value instead (category is immutable).
    formData.set("category", provider.category);
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await createOrUpdateProvider(formData);
      if ("error" in result) {
        setError(t(`errors.${result.error}`));
      } else {
        setSuccess(true);
      }
    });
  };

  const handleSlugSubmit = (formData: FormData) => {
    setSlugError(null);
    setSlugSuccess(false);

    startSlugTransition(async () => {
      const result = await updateProviderSlug(formData);
      if ("error" in result) {
        setSlugError(t(`errors.${result.error}`));
      } else {
        setSlugSuccess(true);
      }
    });
  };

  const handleNotifSubmit = (formData: FormData) => {
    setNotifError(null);
    setNotifSuccess(false);
    formData.set("weekly_summary_opt_in", String(weeklySummaryOptIn));

    startNotifTransition(async () => {
      const result = await updateWeeklySummaryOptIn(formData);
      if ("error" in result) {
        setNotifError(t(`notifications.saveFailed`));
      } else {
        setNotifSuccess(true);
      }
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("businessProfileTitle")}</CardTitle>
          <CardDescription>{t("businessProfileDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-5">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            {success && (
              <p className="text-sm text-green-600">{t("saveSuccess")}</p>
            )}

            <div className="space-y-1.5">
              <Label>{t("fields.category")}</Label>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{provider.category}</Badge>
                <span className="text-xs text-muted-foreground">{t("categoryNote")}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessName">{t("fields.businessName")}</Label>
              <Input
                id="businessName"
                name="businessName"
                defaultValue={provider.businessName}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="address">{t("fields.address")}</Label>
                <Input
                  id="address"
                  name="address"
                  defaultValue={provider.address}
                  required
                  minLength={5}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode">{t("fields.postalCode")}</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  defaultValue={provider.postalCode}
                  required
                  pattern="\d{5}"
                  maxLength={5}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">{t("fields.city")}</Label>
              <Input
                id="city"
                name="city"
                defaultValue={provider.city}
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">{t("fields.phone")}</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={provider.phone ?? ""}
                maxLength={20}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="website">{t("fields.website")}</Label>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://example.com"
                defaultValue={provider.website ?? ""}
                maxLength={200}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">{t("fields.description")}</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={provider.description ?? ""}
                maxLength={500}
                rows={4}
              />
            </div>

            <Button type="submit" disabled={isPending}>
              {isPending ? tCommon("loading") : tCommon("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Slug / vanity URL card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("slugLabel")}</CardTitle>
          <CardDescription>{t("slugHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSlugSubmit} className="space-y-4">
            {slugError && (
              <p className="text-sm text-destructive">{slugError}</p>
            )}
            {slugSuccess && (
              <p className="text-sm text-green-600">{t("saveSuccess")}</p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="slug">{t("slugLabel")}</Label>
              <Input
                id="slug"
                name="slug"
                type="text"
                placeholder={t("slugPlaceholder")}
                value={slugValue}
                onChange={(e) => setSlugValue(e.target.value.toLowerCase())}
                minLength={3}
                maxLength={50}
                pattern="[a-z0-9][a-z0-9\-]{1,48}[a-z0-9]|[a-z0-9]{3,50}"
              />
              <p className="text-xs text-muted-foreground">{t("slugHint")}</p>
              {slugValue.length >= 3 && (
                <p className="text-xs text-muted-foreground">
                  {t("slugPreviewLabel")}{" "}
                  <span className="font-mono">
                    {APP_URL}/de/provider/{slugValue}
                  </span>
                </p>
              )}
            </div>

            <Button type="submit" disabled={isSlugPending}>
              {isSlugPending ? tCommon("loading") : tCommon("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("notifications.title")}</CardTitle>
          <CardDescription>{t("notifications.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleNotifSubmit} className="space-y-4">
            {notifError && (
              <p className="text-sm text-destructive">{notifError}</p>
            )}
            {notifSuccess && (
              <p className="text-sm text-green-600">{t("notifications.savedFeedback")}</p>
            )}

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="weeklySummary"
                checked={weeklySummaryOptIn}
                onChange={(e) => setWeeklySummaryOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input accent-foreground cursor-pointer"
              />
              <div className="space-y-0.5">
                <Label htmlFor="weeklySummary" className="cursor-pointer">
                  {t("notifications.weeklySummaryLabel")}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t("notifications.weeklySummaryDescription")}
                </p>
              </div>
            </div>

            <Button type="submit" disabled={isNotifPending}>
              {isNotifPending ? tCommon("loading") : t("notifications.saveButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
