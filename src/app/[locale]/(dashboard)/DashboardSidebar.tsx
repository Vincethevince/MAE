"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { clsx } from "clsx";

import { Button } from "@/components/ui/button";

interface NavLabels {
  dashboard: string;
  calendar: string;
  services: string;
  settings: string;
}

interface DashboardSidebarProps {
  locale: string;
  businessName: string;
  navLabels: NavLabels;
}

export function DashboardSidebar({
  locale,
  businessName,
  navLabels,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    {
      href: `/${locale}/dashboard`,
      label: navLabels.dashboard,
      icon: LayoutDashboard,
    },
    {
      href: `/${locale}/dashboard/calendar`,
      label: navLabels.calendar,
      icon: CalendarDays,
    },
    {
      href: `/${locale}/dashboard/services`,
      label: navLabels.services,
      icon: Scissors,
    },
    {
      href: `/${locale}/dashboard/settings`,
      label: navLabels.settings,
      icon: Settings,
    },
  ];

  const isActive = (href: string) => {
    if (href === `/${locale}/dashboard`) {
      return pathname === `/${locale}/dashboard`;
    }
    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-6 border-b">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
          MAE
        </p>
        <p className="font-semibold text-sm truncate">{businessName}</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:bg-card">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-card border-b">
        <p className="font-semibold text-sm truncate max-w-[200px]">
          {businessName}
        </p>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Mobile spacer */}
      <div className="lg:hidden h-14" />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={clsx(
          "lg:hidden fixed top-14 left-0 bottom-0 z-40 w-64 bg-card border-r transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
