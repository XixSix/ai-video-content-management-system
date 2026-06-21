import { AppError } from '../../utils/app-error'

export class NotificationsError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static notFound(message = 'Notification not found'): NotificationsError {
    return new NotificationsError(message, 404, 'NOTIFICATION_NOT_FOUND')
  }
}
