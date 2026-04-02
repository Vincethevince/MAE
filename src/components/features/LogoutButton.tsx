"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";

import { logout } from "@/app/[locale]/(auth)/actions";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default";
  className?: string;
}

export function LogoutButton({
  variant = "ghost",
  size = "sm",
  className,
}: LogoutButtonProps) {
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={isPending}
      className={className}
    >
      {isPending ? t("loading") : t("logout")}
    </Button>
  );
}
