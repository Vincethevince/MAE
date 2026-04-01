"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";

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

  const [state, formAction, pending] = useActionState(login, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("loginTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
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
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? tCommon("loading") : tCommon("login")}
          </Button>
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
