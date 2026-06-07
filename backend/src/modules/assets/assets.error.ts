import { AppError } from '../../utils/app-error'

export class AssetsError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static notFound(message = 'Asset not found'): AssetsError {
    return new AssetsError(message, 404, 'ASSET_NOT_FOUND')
  }

  static forbidden(message = 'Asset does not belong to the current user'): AssetsError {
    return new AssetsError(message, 403, 'FORBIDDEN')
  }

  static storageFailure(message = 'Storage operation failed'): AssetsError {
    return new AssetsError(message, 502, 'ASSET_STORAGE_FAILURE')
  }
}
