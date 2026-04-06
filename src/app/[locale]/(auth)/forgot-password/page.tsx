"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";

import { requestPasswordReset } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();

  const [state, formAction, pending] = useActionState(requestPasswordReset, null);

  if (state?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("resetEmailSentTitle")}</CardTitle>
          <CardDescription>{t("resetEmailSentMessage")}</CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Link
            href={`/${locale}/login`}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("backToLogin")}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("forgotPasswordTitle")}</CardTitle>
        <CardDescription>{t("forgotPasswordDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="locale" value={locale} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{t(state.error)}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {t("sendResetEmail")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Link
          href={`/${locale}/login`}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </CardFooter>
    </Card>
  );
}
