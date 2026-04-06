"use client";

import { useTransition, useState } from "react";
import { useTranslations } from "next-intl";

import { createOrUpdateProvider } from "@/app/[locale]/(dashboard)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProviderData {
  businessName: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string | null;
  category: string;
  description: string | null;
  website: string | null;
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

  return (
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
  );
}
