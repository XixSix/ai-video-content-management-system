"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Box, ChevronsUpDown, Sparkles } from "lucide-react";
import { navigationConfig } from "./dashboard-nav";
import { useSocialAccountsStore } from "@/features/social-accounts/social-accounts.store";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const primaryNav = navigationConfig.filter((item) => item.section === "primary");
const workflowNav = navigationConfig.filter((item) => item.section === "create");
const accountNav = navigationConfig.filter((item) => item.section === "account");

export function AppSidebar() {
  const pathname = usePathname();
  const isSocialAccountsOpen = useSocialAccountsStore(
    (state) => state.isManagerOpen
  );
  const openSocialAccounts = useSocialAccountsStore((state) => state.openManager);

  const renderNavItems = (items: typeof navigationConfig) =>
    items.map((item) => {
      const isRouteItem = "href" in item;
      const isActive = isRouteItem
        ? pathname === item.href
        : item.action === "open-social-accounts" && isSocialAccountsOpen;

      return (
        <SidebarMenuItem key={item.title}>
          {isRouteItem ? (
            <SidebarMenuButton
              asChild
              isActive={isActive}
              className="h-9 rounded-lg px-2.5 text-[14px] font-medium text-sidebar-foreground/72 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-[inset_0_0_0_1px_var(--sidebar-border)] hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto"
              tooltip={item.title}
            >
              <Link href={item.href}>
                <item.icon className="mr-2 size-4 shrink-0 text-current opacity-60 group-data-[active=true]/menu-button:opacity-100" />
                <span className="min-w-0 truncate">{item.title}</span>
              </Link>
            </SidebarMenuButton>
          ) : (
            <SidebarMenuButton
              type="button"
              isActive={isActive}
              className="h-9 rounded-lg px-2.5 text-[14px] font-medium text-sidebar-foreground/72 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-active:shadow-[inset_0_0_0_1px_var(--sidebar-border)] hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:mx-auto"
              tooltip={item.title}
              onClick={openSocialAccounts}
            >
              <item.icon className="mr-2 size-4 shrink-0 text-current opacity-60 group-data-[active=true]/menu-button:opacity-100" />
              <span className="min-w-0 truncate">{item.title}</span>
            </SidebarMenuButton>
          )}
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="gap-3 px-3 pb-2 pt-4 group-data-[collapsible=icon]:px-2">
        <Link
          href="/"
          className="flex h-10 items-center gap-2 overflow-hidden rounded-lg px-2 text-[15px] font-semibold tracking-normal transition-[padding] group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-surface-raised shadow-[0_1px_1px_rgba(0,0,0,0.04)]">
            <Box className="size-4 text-primary" />
          </span>
          <span className="min-w-0 truncate group-data-[collapsible=icon]:hidden">
            Antigravity
          </span>
        </Link>

        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="h-10 rounded-lg border border-sidebar-border bg-surface-raised px-2.5 shadow-[0_1px_1px_rgba(0,0,0,0.04)] group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
              tooltip="Workspace"
            >
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent">
                <Sparkles className="size-3.5 text-primary" />
              </span>
              <span className="min-w-0 truncate text-[14px] font-semibold group-data-[collapsible=icon]:hidden">
                Workspace
              </span>
              <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-sidebar-foreground/48 group-data-[collapsible=icon]:hidden" />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-3 pb-3 pt-1 group-data-[collapsible=icon]:px-2">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {renderNavItems(primaryNav)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-4 p-0">
          <SidebarGroupLabel className="h-7 px-2 text-[13px] font-medium text-sidebar-foreground/48">
            Create
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {renderNavItems(workflowNav)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="gap-3 px-3 pb-3 pt-0 group-data-[collapsible=icon]:px-2">
        <div className="rounded-xl bg-black px-3 py-3 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] group-data-[collapsible=icon]:hidden dark:bg-[#050506]">
          <div className="mb-3 flex size-8 items-center justify-center rounded-full bg-white/10">
            <Sparkles className="size-4" />
          </div>
          <p className="text-[13px] font-semibold leading-tight">
            Invite team members
          </p>
          <p className="mt-1 text-xs leading-snug text-white/55">
            Bring your team in to review clips and publish faster.
          </p>
        </div>

        <SidebarMenu className="gap-1">
          {renderNavItems(accountNav)}
          <SidebarMenuItem>
            <SidebarMenuButton className="h-8 rounded-lg bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.13)_0_4px,transparent_4px_8px),#101012] px-2.5 text-white hover:bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.18)_0_4px,transparent_4px_8px),#101012] hover:text-white group-data-[collapsible=icon]:mx-auto">
              <Sparkles className="mr-2 size-3.5 shrink-0" />
              <span className="min-w-0 truncate text-[13px] font-semibold">
                Upgrade
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
