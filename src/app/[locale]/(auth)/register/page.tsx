"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";

import { register, type RegisterState } from "../actions";
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

export default function RegisterPage() {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [state, formAction, pending] = useActionState<RegisterState, FormData>(register, null);

  if (state?.pendingConfirmation) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("checkEmailTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>{t("checkEmailBody", { email: state.email ?? "" })}</p>
          <p>{t("checkEmailSpam")}</p>
        </CardContent>
        <CardFooter className="justify-center gap-1 text-sm">
          <span className="text-muted-foreground">{t("hasAccount")}</span>
          <Link
            href={`/${locale}/login`}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {tCommon("login")}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">{t("registerTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">{t("fullName")}</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              aria-describedby={state?.fieldErrors?.fullName ? "fullName-error" : undefined}
            />
            {state?.fieldErrors?.fullName && (
              <p id="fullName-error" className="text-sm text-destructive">{t(state.fieldErrors.fullName)}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              aria-describedby={state?.fieldErrors?.email ? "email-error" : undefined}
            />
            {state?.fieldErrors?.email && (
              <p id="email-error" className="text-sm text-destructive">{t(state.fieldErrors.email)}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              aria-describedby={state?.fieldErrors?.password ? "password-error" : undefined}
            />
            {state?.fieldErrors?.password && (
              <p id="password-error" className="text-sm text-destructive">{t(state.fieldErrors.password)}</p>
            )}
            <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              aria-describedby={state?.fieldErrors?.confirmPassword ? "confirmPassword-error" : undefined}
            />
            {state?.fieldErrors?.confirmPassword && (
              <p id="confirmPassword-error" className="text-sm text-destructive">{t(state.fieldErrors.confirmPassword)}</p>
            )}
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium leading-none">
              {t("role")}
            </legend>
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="role"
                  value="user"
                  defaultChecked
                  className="accent-primary"
                />
                {t("registerAsUser")}
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="role"
                  value="provider"
                  className="accent-primary"
                />
                {t("registerAsProvider")}
              </label>
            </div>
          </fieldset>
          {state?.error && (
            <p className="text-sm text-destructive">{t(state.error)}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? tCommon("loading") : tCommon("register")}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center gap-1 text-sm">
        <span className="text-muted-foreground">{t("hasAccount")}</span>
        <Link
          href={`/${locale}/login`}
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {tCommon("login")}
        </Link>
      </CardFooter>
    </Card>
  );
}
