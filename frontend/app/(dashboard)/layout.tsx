import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { DashboardHeader } from "@/components/layout/dashboard-header";
import { LongToShortManager } from "@/features/long-to-short/components/long-to-short-manager";
import { SocialAccountsManager } from "@/features/social-accounts/components/social-accounts-manager";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <div className="flex flex-1 flex-col w-full min-h-screen">
        <DashboardHeader />
        <main className="flex-1 p-4 lg:p-6 bg-background">
          {children}
        </main>
        <LongToShortManager />
        <SocialAccountsManager />
      </div>
    </SidebarProvider>
  );
}
