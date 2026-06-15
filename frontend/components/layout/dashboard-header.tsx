"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navigationConfig } from "./dashboard-nav";
import { HeaderAccountMenu } from "./header-account-menu";
import { HeaderNotifications } from "./header-notifications";
import { ThemeToggle } from "./theme-toggle";

export function DashboardHeader() {
  const pathname = usePathname();
  
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
      <div className="flex items-center gap-1 sm:gap-2">
        <ThemeToggle />
        <HeaderNotifications />
        <HeaderAccountMenu />
      </div>
    </header>
  );
}
