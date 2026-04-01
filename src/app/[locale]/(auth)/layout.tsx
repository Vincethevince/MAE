import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

interface AuthLayoutProps {
  children: ReactNode;
}

export default async function AuthLayout({ children }: AuthLayoutProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">MAE</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Make Appointments Easier
        </p>
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
