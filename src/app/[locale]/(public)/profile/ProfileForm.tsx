"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { updateProfile } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProfileFormProps {
  fullName: string;
  locale: string;
}

export function ProfileForm({ fullName, locale }: ProfileFormProps) {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (formData: FormData) => {
    formData.set("locale", locale);
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateProfile(formData);
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
        <CardTitle className="text-base">{t("fullNameLabel")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{t("saveSuccess")}</p>}

          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t("fullNameLabel")}</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={fullName}
              required
              minLength={2}
              maxLength={100}
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
