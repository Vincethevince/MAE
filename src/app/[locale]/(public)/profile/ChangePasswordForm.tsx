"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { changePassword } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChangePasswordForm() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const tAuth = useTranslations("auth");

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await changePassword(formData);
      if ("error" in result) {
        const key = result.error as string;
        // Map error keys that live in auth namespace
        if (key === "passwordMismatch") {
          setError(tAuth("passwordMismatch"));
        } else if (key === "currentPasswordWrong") {
          setError(t("errors.currentPasswordWrong"));
        } else {
          setError(t(`errors.${key}`));
        }
      } else {
        setSuccess(true);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("changePasswordTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-green-600">{t("passwordChanged")}</p>}

          <div className="space-y-1.5">
            <Label htmlFor="currentPassword">{t("currentPasswordLabel")}</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="newPassword">{tAuth("newPassword")}</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">{tAuth("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? tCommon("loading") : tAuth("updatePassword")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
