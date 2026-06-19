import { AppError } from '../../utils/app-error'

export class AuthError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static unauthorized(message = 'Unauthorized'): AuthError {
    return new AuthError(message, 401, 'UNAUTHORIZED')
  }

  static forbidden(message = 'Forbidden'): AuthError {
    return new AuthError(message, 403, 'FORBIDDEN')
  }

  static conflict(message = 'Resource already exists'): AuthError {
    return new AuthError(message, 409, 'CONFLICT')
  }

  static sessionStoreUnavailable(message = 'Authentication session store is unavailable'): AuthError {
    return new AuthError(message, 503, 'AUTH_SESSION_STORE_UNAVAILABLE')
  }
}
