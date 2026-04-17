"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ExportDataForm() {
  const t = useTranslations("profile.exportData");

  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsLoading(true);

    try {
      const response = await fetch("/api/profile/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        let errorKey = "errorGeneric";
        try {
          const json = await response.json();
          if (json?.error === "currentPasswordWrong") errorKey = "errorWrongPassword";
        } catch {
          // response body not JSON — fall through to generic error
        }
        setError(t(errorKey as "errorWrongPassword" | "errorGeneric"));
        return;
      }

      // Derive filename from Content-Disposition header, fall back to generic name
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "mae-data-export.json";

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);

      setSuccess(true);
      setPassword("");
    } catch {
      setError(t("errorGeneric"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {success && <p className="text-sm text-green-600">{t("successMessage")}</p>}

      <div className="space-y-1.5">
        <Label htmlFor="export-password">{t("passwordLabel")}</Label>
        <Input
          id="export-password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={t("passwordPlaceholder")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={isLoading} variant="outline">
        {isLoading ? t("loadingButton") : t("submitButton")}
      </Button>
    </form>
  );
}
