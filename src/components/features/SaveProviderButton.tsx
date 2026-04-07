"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleSaveProvider } from "@/app/[locale]/(public)/saved/actions";

interface SaveProviderButtonProps {
  providerId: string;
  initialSaved: boolean;
  locale: string;
  saveLabel: string;
  unsaveLabel: string;
}

export function SaveProviderButton({
  providerId,
  initialSaved,
  locale,
  saveLabel,
  unsaveLabel,
}: SaveProviderButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.set("providerId", providerId);
        formData.set("locale", locale);
        await toggleSaveProvider(formData);
        setSaved((prev) => !prev);
      } catch {
        // Server action failed — leave state unchanged
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={saved ? unsaveLabel : saveLabel}
      aria-pressed={saved}
      className={cn(
        "rounded-full p-1.5 transition-colors hover:bg-muted/60",
        isPending && "opacity-50 pointer-events-none"
      )}
    >
      <Heart
        className={cn(
          "size-4",
          saved ? "fill-red-500 text-red-500" : "text-muted-foreground"
        )}
      />
    </button>
  );
}
