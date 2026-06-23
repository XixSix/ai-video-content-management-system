import { AppError } from '../../utils/app-error'

export class RenderExportsError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static projectNotFound(message = 'Project not found'): RenderExportsError {
    return new RenderExportsError(message, 404, 'PROJECT_NOT_FOUND')
  }

  static forbidden(message = 'Project cannot be exported by the current user'): RenderExportsError {
    return new RenderExportsError(message, 403, 'FORBIDDEN')
  }

  static sourceMediaRequired(message = 'Project source media is required before export'): RenderExportsError {
    return new RenderExportsError(message, 409, 'PROJECT_SOURCE_MEDIA_REQUIRED')
  }

  static invalidSourceMedia(message = 'Project source media cannot be exported'): RenderExportsError {
    return new RenderExportsError(message, 409, 'PROJECT_SOURCE_MEDIA_INVALID')
  }

  static snapshotRequired(message = 'Project editor snapshot is required before export'): RenderExportsError {
    return new RenderExportsError(message, 409, 'PROJECT_EDITOR_SNAPSHOT_REQUIRED')
  }

  static queuePublishFailed(message = 'Failed to publish render export job'): RenderExportsError {
    return new RenderExportsError(message, 503, 'RENDER_EXPORT_QUEUE_PUBLISH_FAILED')
  }
}
