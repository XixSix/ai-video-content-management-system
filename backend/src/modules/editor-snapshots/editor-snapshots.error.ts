import type { ErrorDetails } from '../../utils/app-error'
import { AppError } from '../../utils/app-error'

export class EditorSnapshotsError extends AppError {
  private constructor(message: string, statusCode: number, code: string, details?: ErrorDetails) {
    super(message, statusCode, code, details)
  }

  static projectNotFound(message = 'Project not found'): EditorSnapshotsError {
    return new EditorSnapshotsError(message, 404, 'PROJECT_NOT_FOUND')
  }

  static forbidden(message = 'Editor snapshot cannot be modified by the current user'): EditorSnapshotsError {
    return new EditorSnapshotsError(message, 403, 'FORBIDDEN')
  }

  static versionConflict(currentVersion: number, baseVersion: number): EditorSnapshotsError {
    return new EditorSnapshotsError('Editor snapshot version changed', 409, 'EDITOR_SNAPSHOT_VERSION_CONFLICT', {
      currentVersion,
      baseVersion
    })
  }
}
