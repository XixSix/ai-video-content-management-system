import { describe, expect, it } from '@jest/globals'
import {
  buildPlatformOauthRedirectUrl,
  decryptToken,
  encryptToken,
  getTokenLast4,
  hashOAuthState,
  resolvePlatform
} from './platform-accounts.util'

describe('platform account utilities', () => {
  it('encrypts and decrypts tokens', () => {
    const encrypted = encryptToken('youtube-refresh-token')

    expect(encrypted).not.toBe('youtube-refresh-token')
    expect(decryptToken(encrypted)).toBe('youtube-refresh-token')
  })

  it('builds frontend redirect URLs', () => {
    expect(buildPlatformOauthRedirectUrl('YOUTUBE', 'failed', 'PLATFORM_OAUTH_STATE_INVALID')).toBe(
      'http://localhost:5173/settings/integrations?platform=YOUTUBE&status=failed&code=PLATFORM_OAUTH_STATE_INVALID'
    )
  })

  it('hashes oauth state and exposes the last four token characters', () => {
    expect(hashOAuthState('oauth-state')).toHaveLength(64)
    expect(getTokenLast4('refresh-token')).toBe('oken')
  })

  it('resolves platform route values to Prisma platform enums', () => {
    expect(resolvePlatform('YOUTUBE')).toBe('YOUTUBE')
    expect(resolvePlatform('FACEBOOK')).toBe('FACEBOOK')
  })
})
