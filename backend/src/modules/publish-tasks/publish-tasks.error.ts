import { AppError } from '../../utils/app-error'

export class PublishTasksError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static notFound(message = 'Publish task not found'): PublishTasksError {
    return new PublishTasksError(message, 404, 'PUBLISH_TASK_NOT_FOUND')
  }

  static forbidden(message = 'Publish task does not belong to the current user'): PublishTasksError {
    return new PublishTasksError(message, 403, 'FORBIDDEN')
  }

  static targetNotFound(message = 'Publish target not found'): PublishTasksError {
    return new PublishTasksError(message, 404, 'PUBLISH_TARGET_NOT_FOUND')
  }

  static targetForbidden(message = 'Publish target does not belong to the current user'): PublishTasksError {
    return new PublishTasksError(message, 403, 'FORBIDDEN')
  }

  static invalidTargetState(message = 'Publish target is not publishable'): PublishTasksError {
    return new PublishTasksError(message, 409, 'PUBLISH_TARGET_INVALID_STATE')
  }

  static platformAccountNotFound(message = 'Platform account not found'): PublishTasksError {
    return new PublishTasksError(message, 404, 'PLATFORM_ACCOUNT_NOT_FOUND')
  }

  static platformAccountForbidden(message = 'Platform account does not belong to the current user'): PublishTasksError {
    return new PublishTasksError(message, 403, 'FORBIDDEN')
  }

  static invalidPlatformAccount(message = 'Platform account cannot be used for this publish task'): PublishTasksError {
    return new PublishTasksError(message, 409, 'PLATFORM_ACCOUNT_INVALID_STATE')
  }

  static locked(message = 'Publish task cannot be edited in its current status'): PublishTasksError {
    return new PublishTasksError(message, 409, 'PUBLISH_TASK_LOCKED')
  }
}
