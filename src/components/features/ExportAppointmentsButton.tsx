"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExportAppointmentsButtonProps {
  label: string;
  loadingLabel: string;
  year?: number;
}

export function ExportAppointmentsButton({
  label,
  loadingLabel,
  year,
}: ExportAppointmentsButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const url = year
        ? `/api/dashboard/appointments/export?year=${year}`
        : "/api/dashboard/appointments/export";

      const response = await fetch(url);
      if (!response.ok) {
        console.error("[export] Failed:", response.status);
        return;
      }

      // Derive filename from Content-Disposition header, fall back to generic name
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match ? decodeURIComponent(match[1]) : "mae-termine.csv";

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
    >
      {loading ? (
        <>
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          {loadingLabel}
        </>
      ) : (
        <>
          <Download className="mr-1.5 h-4 w-4" />
          {label}
        </>
      )}
    </Button>
  );
}
