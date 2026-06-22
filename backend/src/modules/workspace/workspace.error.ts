import { AppError } from '../../utils/app-error'

export class WorkspaceError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static forbidden(message = 'You are not a member of this workspace'): WorkspaceError {
    return new WorkspaceError(message, 403, 'FORBIDDEN')
  }

  static ownerRequired(message = 'Workspace owner permission is required'): WorkspaceError {
    return new WorkspaceError(message, 403, 'WORKSPACE_OWNER_REQUIRED')
  }
}
