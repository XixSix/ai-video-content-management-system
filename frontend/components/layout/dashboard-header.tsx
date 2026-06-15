"use client";

import { usePathname } from "next/navigation";
import { LogIn, UserPlus } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navigationConfig } from "./dashboard-nav";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/features/auth/auth.store";

export function DashboardHeader() {
  const pathname = usePathname();
  const openAuth = useAuthStore((state) => state.openManager);
  
  // Find current route title or default to "Home" if matched "/"
  const currentNav = navigationConfig.find(
    (item) => "href" in item && item.href === pathname
  );
  const title = currentNav ? currentNav.title : "Workspace";

  return (
    <header className="flex h-14 items-center gap-4 border-b border-border bg-background px-4 lg:h-[60px] lg:px-6">
      <SidebarTrigger />
      <div className="flex-1">
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => openAuth("login")}
        >
          <LogIn className="size-4" />
          <span className="hidden sm:inline">Sign in</span>
        </Button>
        <Button type="button" size="sm" onClick={() => openAuth("signup")}>
          <UserPlus className="size-4" />
          <span className="hidden sm:inline">Sign up</span>
        </Button>
      </div>
    </header>
  );
}
