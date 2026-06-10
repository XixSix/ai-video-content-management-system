"use client";

import { usePathname } from "next/navigation";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { navigationConfig } from "./dashboard-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
      <div className="flex items-center gap-4">
        {/* Placeholder for User Profile Menu */}
        <Avatar className="h-8 w-8 cursor-pointer">
          <AvatarFallback className="bg-primary/10 text-primary text-xs">U</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
