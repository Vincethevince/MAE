"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";

import { updatePassword } from "../(auth)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();

  const [state, formAction, pending] = useActionState(updatePassword, null);

  useEffect(() => {
    if (state?.success) {
      const timer = setTimeout(() => {
        router.push(`/${locale}/login`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [state?.success, locale, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">MAE</h1>
        <p className="mt-1 text-sm text-muted-foreground">Make Appointments Easier</p>
      </div>
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{t("resetPasswordTitle")}</CardTitle>
            <CardDescription>{t("resetPasswordDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {state?.success ? (
              <p className="text-sm text-green-600">{t("passwordUpdated")}</p>
            ) : (
              <form action={formAction} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="password">{t("newPassword")}</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                  />
                </div>
                {state?.error && (
                  <p className="text-sm text-destructive">{t(state.error)}</p>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {t("updatePassword")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
