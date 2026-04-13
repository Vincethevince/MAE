"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { MapPin, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GeoSearchButtonProps {
  locale: string;
  currentParams: Record<string, string>;
}

export function GeoSearchButton({ locale, currentParams }: GeoSearchButtonProps) {
  const t = useTranslations("search");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasGeoFilter = Boolean(currentParams.lat && currentParams.lng);

  function handleClear() {
    const params = { ...currentParams };
    delete params.lat;
    delete params.lng;
    const qs = new URLSearchParams(params).toString();
    router.push(`/${locale}/search${qs ? `?${qs}` : ""}`);
  }

  function handleClick() {
    if (hasGeoFilter) {
      handleClear();
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const params = new URLSearchParams({
          ...currentParams,
          lat: latitude.toFixed(6),
          lng: longitude.toFixed(6),
        });
        router.push(`/${locale}/search?${params.toString()}`);
        setLoading(false);
      },
      () => {
        setError(t("locationDenied"));
        setLoading(false);
      },
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        type="button"
        variant={hasGeoFilter ? "default" : "outline"}
        size="sm"
        onClick={handleClick}
        disabled={loading}
      >
        {loading ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            {t("gettingLocation")}
          </>
        ) : hasGeoFilter ? (
          <>
            <MapPin className="mr-1.5 h-3.5 w-3.5" />
            {t("nearMeActive")}
            <X className="ml-1.5 h-3 w-3 opacity-70" />
          </>
        ) : (
          <>
            <MapPin className="mr-1.5 h-3.5 w-3.5" />
            {t("nearMe")}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-destructive max-w-[280px]">{error}</p>
      )}
    </div>
  );
}
