"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";

import { login } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";

  const [state, formAction, pending] = useActionState(login, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("loginTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          {next && <input type="hidden" name="next" value={next} />}
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {state?.error && (
            <p className="text-sm text-destructive">{t(state.error)}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <Button type="submit" className="flex-1" disabled={pending}>
              {pending ? tCommon("loading") : tCommon("login")}
            </Button>
            <Link
              href={`/${locale}/forgot-password`}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline hover:text-foreground transition-colors"
            >
              {t("forgotPassword")}
            </Link>
          </div>
        </form>
      </CardContent>
      <CardFooter className="justify-center gap-1 text-sm">
        <span className="text-muted-foreground">{t("noAccount")}</span>
        <Link
          href={`/${locale}/register`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {tCommon("register")}
        </Link>
      </CardFooter>
    </Card>
  );
}
