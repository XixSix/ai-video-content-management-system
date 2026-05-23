import { AppError } from '../../utils/app-error'

export class MediaError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static forbidden(message = 'Media object does not belong to the current user'): MediaError {
    return new MediaError(message, 403, 'FORBIDDEN')
  }

  static notFound(message = 'Media not found'): MediaError {
    return new MediaError(message, 404, 'MEDIA_NOT_FOUND')
  }

  static invalidUpload(message = 'Invalid media upload request'): MediaError {
    return new MediaError(message, 400, 'INVALID_MEDIA_UPLOAD')
  }

  static storageFailure(message = 'Storage operation failed'): MediaError {
    return new MediaError(message, 502, 'STORAGE_FAILURE')
  }
}
