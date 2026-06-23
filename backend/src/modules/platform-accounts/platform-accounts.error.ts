import { AppError } from '../../utils/app-error'

export class PlatformAccountsError extends AppError {
  private constructor(message: string, statusCode: number, code: string) {
    super(message, statusCode, code)
  }

  static unsupportedPlatform(message = 'Unsupported platform'): PlatformAccountsError {
    return new PlatformAccountsError(message, 400, 'UNSUPPORTED_PLATFORM')
  }

  static invalidCallback(message = 'Invalid OAuth callback'): PlatformAccountsError {
    return new PlatformAccountsError(message, 400, 'PLATFORM_OAUTH_CALLBACK_INVALID')
  }

  static authorizationDenied(message = 'OAuth authorization denied'): PlatformAccountsError {
    return new PlatformAccountsError(message, 400, 'PLATFORM_OAUTH_AUTHORIZATION_DENIED')
  }

  static invalidState(message = 'OAuth state is invalid'): PlatformAccountsError {
    return new PlatformAccountsError(message, 400, 'PLATFORM_OAUTH_STATE_INVALID')
  }

  static expiredState(message = 'OAuth state has expired'): PlatformAccountsError {
    return new PlatformAccountsError(message, 400, 'PLATFORM_OAUTH_STATE_EXPIRED')
  }

  static consumedState(message = 'OAuth state has already been used'): PlatformAccountsError {
    return new PlatformAccountsError(message, 409, 'PLATFORM_OAUTH_STATE_CONSUMED')
  }

  static tokenExchangeFailed(message = 'Failed to exchange OAuth code for tokens'): PlatformAccountsError {
    return new PlatformAccountsError(message, 502, 'PLATFORM_OAUTH_TOKEN_EXCHANGE_FAILED')
  }

  static channelFetchFailed(message = 'Failed to load the authenticated YouTube channel'): PlatformAccountsError {
    return new PlatformAccountsError(message, 502, 'PLATFORM_OAUTH_CHANNEL_FETCH_FAILED')
  }

  static accountFetchFailed(message = 'Failed to load the authenticated platform account'): PlatformAccountsError {
    return new PlatformAccountsError(message, 502, 'PLATFORM_OAUTH_ACCOUNT_FETCH_FAILED')
  }

  static accountNotFound(message = 'Platform account not found'): PlatformAccountsError {
    return new PlatformAccountsError(message, 404, 'PLATFORM_ACCOUNT_NOT_FOUND')
  }

  static accountForbidden(
    message = 'Platform account does not belong to the current workspace'
  ): PlatformAccountsError {
    return new PlatformAccountsError(message, 403, 'FORBIDDEN')
  }

  static invalidAccount(message = 'Platform account cannot be used'): PlatformAccountsError {
    return new PlatformAccountsError(message, 409, 'PLATFORM_ACCOUNT_INVALID_STATE')
  }

  static providerUnavailable(message = 'Platform credential service is unavailable'): PlatformAccountsError {
    return new PlatformAccountsError(message, 502, 'PLATFORM_CREDENTIAL_PROVIDER_UNAVAILABLE')
  }
}
