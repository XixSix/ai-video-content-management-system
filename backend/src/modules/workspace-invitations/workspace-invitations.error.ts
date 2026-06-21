import { AppError } from '../../utils/app-error'

export class WorkspaceInvitationsError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static forbidden(message = 'Only workspace owners can invite members'): WorkspaceInvitationsError {
    return new WorkspaceInvitationsError(message, 403, 'FORBIDDEN')
  }

  static inviteeNotAvailable(message = 'Invitee is not available'): WorkspaceInvitationsError {
    return new WorkspaceInvitationsError(message, 404, 'INVITEE_NOT_AVAILABLE')
  }

  static selfInvitation(message = 'You cannot invite yourself'): WorkspaceInvitationsError {
    return new WorkspaceInvitationsError(message, 400, 'SELF_INVITATION_NOT_ALLOWED')
  }

  static alreadyMember(message = 'User is already a workspace member'): WorkspaceInvitationsError {
    return new WorkspaceInvitationsError(message, 409, 'ALREADY_WORKSPACE_MEMBER')
  }

  static pendingExists(message = 'A pending invitation already exists'): WorkspaceInvitationsError {
    return new WorkspaceInvitationsError(message, 409, 'PENDING_INVITATION_EXISTS')
  }

  static notFound(message = 'Workspace invitation not found'): WorkspaceInvitationsError {
    return new WorkspaceInvitationsError(message, 404, 'WORKSPACE_INVITATION_NOT_FOUND')
  }

  static expired(message = 'Workspace invitation has expired'): WorkspaceInvitationsError {
    return new WorkspaceInvitationsError(message, 410, 'INVITATION_EXPIRED')
  }

  static alreadyProcessed(message = 'Workspace invitation has already been processed'): WorkspaceInvitationsError {
    return new WorkspaceInvitationsError(message, 409, 'INVITATION_ALREADY_PROCESSED')
  }
}
