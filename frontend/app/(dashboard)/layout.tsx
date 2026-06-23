import { AppSidebar } from "@/components/layout/app-sidebar"
import { DashboardHeader } from "@/components/layout/dashboard-header"
import { SidebarProvider } from "@/components/ui/sidebar"
import { ProtectedRoute } from "@/features/auth/components/auth-guard"
import { LongToShortManager } from "@/features/long-to-short/components/long-to-short-manager"
import { SocialAccountsManager } from "@/features/social-accounts/components/social-accounts-manager"
import { WorkspaceProvider } from "@/features/workspaces/components/workspace-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedRoute>
      <WorkspaceProvider>
        <SidebarProvider>
          <AppSidebar />
          <div className="flex min-h-screen w-full flex-1 flex-col">
            <DashboardHeader />
            <main className="flex-1 bg-background p-4 lg:p-6">{children}</main>
            <LongToShortManager />
            <SocialAccountsManager />
          </div>
        </SidebarProvider>
      </WorkspaceProvider>
    </ProtectedRoute>
  )
}
