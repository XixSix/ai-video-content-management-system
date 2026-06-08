import { google } from 'googleapis'
import { config } from '../../config'
import type {
  YouTubeChannelProfile,
  YouTubeConnectionTokens
} from '../../modules/platform-accounts/platform-accounts.types'

const createOAuthClient = () =>
  new google.auth.OAuth2(
    config.platform.youtubeClientId,
    config.platform.youtubeClientSecret,
    config.platform.youtubeRedirectUri
  )

export const createYouTubeAuthUrl = (state: string): string => {
  const client = createOAuthClient()

  return client.generateAuthUrl({
    access_type: 'offline',
    include_granted_scopes: true,
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
    state
  })
}

export const exchangeYouTubeCode = async (code: string): Promise<YouTubeConnectionTokens> => {
  const client = createOAuthClient()
  const { tokens } = await client.getToken(code)

  if (!tokens.access_token) {
    throw new Error('Google OAuth response did not include an access token')
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: typeof tokens.expiry_date === 'number' ? new Date(tokens.expiry_date) : null
  }
}

export const getAuthenticatedYouTubeChannel = async (
  tokens: YouTubeConnectionTokens
): Promise<YouTubeChannelProfile> => {
  const client = createOAuthClient()
  client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken ?? undefined,
    expiry_date: tokens.expiresAt?.getTime()
  })

  const youtube = google.youtube({ version: 'v3', auth: client })
  const response = await youtube.channels.list({
    mine: true,
    part: ['snippet']
  })

  const channel = response.data.items?.[0]
  const platformUserId = channel?.id
  const accountName = channel?.snippet?.title

  if (!platformUserId || !accountName) {
    throw new Error('Authenticated YouTube channel not found')
  }

  return {
    accountName,
    platformUserId
  }
}

export const revokeYouTubeToken = async (token: string): Promise<void> => {
  const client = createOAuthClient()
  await client.revokeToken(token)
}
