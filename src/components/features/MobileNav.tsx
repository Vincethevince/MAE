"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/lib/button-variants";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  locale: string;
  isLoggedIn: boolean;
  isProvider: boolean;
  userRole: string | null;
  labels: {
    appName: string;
    forBusinesses: string;
    login: string;
    register: string;
    dashboard: string;
    completeSetup: string;
    myAppointments: string;
    saved: string;
    profile: string;
    logout: string;
  };
  logoutAction: React.ReactNode;
}

export function MobileNav({
  locale,
  isLoggedIn,
  isProvider,
  userRole,
  labels,
  logoutAction,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "md:hidden"
        )}
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-50 bg-black/40"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed inset-y-0 right-0 z-50 w-72 bg-background shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b px-4 h-14">
              <span className="font-bold">{labels.appName}</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className={buttonVariants({ variant: "ghost", size: "icon" })}
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="flex flex-col gap-1 p-4">
              {isLoggedIn ? (
                <>
                  <Link
                    href={`/${locale}/appointments`}
                    onClick={() => setOpen(false)}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    {labels.myAppointments}
                  </Link>
                  <Link
                    href={`/${locale}/saved`}
                    onClick={() => setOpen(false)}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    {labels.saved}
                  </Link>
                  <Link
                    href={`/${locale}/profile`}
                    onClick={() => setOpen(false)}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    {labels.profile}
                  </Link>
                  {isProvider ? (
                    <Link
                      href={`/${locale}/dashboard`}
                      onClick={() => setOpen(false)}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      {labels.dashboard}
                    </Link>
                  ) : userRole === "provider" ? (
                    <Link
                      href={`/${locale}/dashboard/onboarding`}
                      onClick={() => setOpen(false)}
                      className={buttonVariants({ variant: "default" })}
                    >
                      {labels.completeSetup}
                    </Link>
                  ) : null}
                  <div className="mt-2">{logoutAction}</div>
                </>
              ) : (
                <>
                  <Link
                    href={`/${locale}/for-businesses`}
                    onClick={() => setOpen(false)}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    {labels.forBusinesses}
                  </Link>
                  <Link
                    href={`/${locale}/login`}
                    onClick={() => setOpen(false)}
                    className={buttonVariants({ variant: "ghost" })}
                  >
                    {labels.login}
                  </Link>
                  <Link
                    href={`/${locale}/register`}
                    onClick={() => setOpen(false)}
                    className={buttonVariants()}
                  >
                    {labels.register}
                  </Link>
                </>
              )}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
