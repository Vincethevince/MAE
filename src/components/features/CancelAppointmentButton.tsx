"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

interface CancelAppointmentButtonProps {
  appointmentId: string;
  locale: string;
  onCancel: (formData: FormData) => Promise<void>;
}

export function CancelAppointmentButton({
  appointmentId,
  locale,
  onCancel,
}: CancelAppointmentButtonProps) {
  const t = useTranslations("appointments");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm(t("cancelConfirm"))) {
      e.preventDefault();
    }
  };

  return (
    <form action={onCancel} onSubmit={handleSubmit} className="mt-4">
      <input type="hidden" name="appointmentId" value={appointmentId} />
      <input type="hidden" name="locale" value={locale} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5"
      >
        {t("cancelButton")}
      </Button>
    </form>
  );
}
