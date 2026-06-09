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
}
