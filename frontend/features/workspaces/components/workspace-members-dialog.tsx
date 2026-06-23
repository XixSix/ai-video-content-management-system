"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { LoaderCircle, MailPlus, Users } from "lucide-react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import {
  useInviteWorkspaceMember,
  useWorkspaceMembers,
} from "../hooks/use-workspaces"
import { canInviteWorkspaceMembers, getWorkspaceInitials } from "../workspace.utils"
import { useWorkspace } from "./workspace-provider"

const inviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
})

type InviteForm = z.infer<typeof inviteSchema>

export function WorkspaceMembersDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id ?? ""
  const membersQuery = useWorkspaceMembers(workspaceId, open)
  const inviteMutation = useInviteWorkspaceMember(workspaceId)
  const canInvite = selectedWorkspace
    ? canInviteWorkspaceMembers(selectedWorkspace.role)
    : false
  const form = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: "" },
  })

  const submitInvite = form.handleSubmit(({ email }) => {
    inviteMutation.mutate(email.trim().toLowerCase(), {
      onSuccess: ({ invitation }) => {
        form.reset()
        toast.success("Invitation sent", {
          description: invitation.invitee.email,
        })
      },
      onError: (error) =>
        toast.error("Unable to send invitation", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        }),
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Workspace members</DialogTitle>
          <DialogDescription>
            {selectedWorkspace
              ? `People who can access ${selectedWorkspace.name}.`
              : "Select a workspace to view its members."}
          </DialogDescription>
        </DialogHeader>

        {canInvite ? (
          <form className="flex gap-2" onSubmit={submitInvite}>
            <div className="min-w-0 flex-1">
              <Input
                type="email"
                placeholder="teammate@example.com"
                aria-label="Invitee email"
                disabled={inviteMutation.isPending}
                {...form.register("email")}
              />
              {form.formState.errors.email ? (
                <p className="mt-1.5 text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <MailPlus className="size-4" />
              )}
              Invite
            </Button>
          </form>
        ) : (
          <div className="rounded-lg border border-border/70 bg-muted/35 px-3 py-2.5 text-xs leading-5 text-muted-foreground">
            Members can view the team. Only workspace owners can send
            invitations.
          </div>
        )}

        <div className="max-h-80 overflow-y-auto rounded-lg border border-border/70">
          {membersQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading members...
            </div>
          ) : membersQuery.isError ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm font-medium">Members could not be loaded</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {membersQuery.error instanceof Error
                  ? membersQuery.error.message
                  : "Please try again."}
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => void membersQuery.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : membersQuery.data?.members.length ? (
            <div className="divide-y divide-border/60">
              {membersQuery.data.members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center gap-3 px-3 py-3"
                >
                  <Avatar>
                    <AvatarFallback>
                      {getWorkspaceInitials(member.fullName ?? member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {member.fullName ?? member.email}
                    </p>
                    {member.fullName ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {member.email}
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={member.role === "OWNER" ? "success" : "neutral"}>
                    {member.role}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center px-4 py-10 text-center">
              <Users className="size-5 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium">No members found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Invite a teammate to start collaborating.
              </p>
            </div>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
