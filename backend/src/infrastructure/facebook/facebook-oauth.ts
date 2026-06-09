import { config } from '../../config'
import type {
  FacebookConnectionTokens,
  FacebookPageProfile
} from '../../modules/platform-accounts/platform-accounts.types'

const facebookScopes = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts', 'publish_video']

interface FacebookErrorResponse {
  error?: {
    message?: string
    type?: string
    code?: number
  }
}

interface FacebookTokenResponse extends FacebookErrorResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
}

interface FacebookAccountsResponse extends FacebookErrorResponse {
  data?: Array<{
    access_token?: string
    id?: string
    name?: string
    tasks?: string[]
  }>
}

const createGraphUrl = (path: string): URL =>
  new URL(`https://graph.facebook.com/${config.platform.facebookGraphApiVersion}${path}`)

const readFacebookJson = async <T extends FacebookErrorResponse>(response: Response): Promise<T> => {
  const body = (await response.json()) as T

  if (!response.ok || body.error) {
    throw new Error(body.error?.message ?? `Facebook Graph API request failed with status ${response.status}`)
  }

  return body
}

const getTokenExpiresAt = (expiresInSeconds: number | undefined): Date | null => {
  if (!expiresInSeconds) {
    return null
  }

  return new Date(Date.now() + expiresInSeconds * 1000)
}

export const createFacebookAuthUrl = (state: string): string => {
  const url = new URL(`https://www.facebook.com/${config.platform.facebookGraphApiVersion}/dialog/oauth`)
  url.searchParams.set('client_id', config.platform.facebookAppId)
  url.searchParams.set('redirect_uri', config.platform.facebookRedirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', facebookScopes.join(','))
  url.searchParams.set('state', state)

  return url.toString()
}

export const exchangeFacebookCode = async (code: string): Promise<FacebookConnectionTokens> => {
  const shortLivedUrl = createGraphUrl('/oauth/access_token')
  shortLivedUrl.searchParams.set('client_id', config.platform.facebookAppId)
  shortLivedUrl.searchParams.set('client_secret', config.platform.facebookAppSecret)
  shortLivedUrl.searchParams.set('redirect_uri', config.platform.facebookRedirectUri)
  shortLivedUrl.searchParams.set('code', code)

  const shortLivedResponse = await readFacebookJson<FacebookTokenResponse>(await fetch(shortLivedUrl))

  if (!shortLivedResponse.access_token) {
    throw new Error('Facebook OAuth response did not include an access token')
  }

  const longLivedUrl = createGraphUrl('/oauth/access_token')
  longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
  longLivedUrl.searchParams.set('client_id', config.platform.facebookAppId)
  longLivedUrl.searchParams.set('client_secret', config.platform.facebookAppSecret)
  longLivedUrl.searchParams.set('fb_exchange_token', shortLivedResponse.access_token)

  const longLivedResponse = await readFacebookJson<FacebookTokenResponse>(await fetch(longLivedUrl))
  const accessToken = longLivedResponse.access_token ?? shortLivedResponse.access_token

  return {
    accessToken,
    refreshToken: null,
    expiresAt: getTokenExpiresAt(longLivedResponse.expires_in ?? shortLivedResponse.expires_in)
  }
}

export const getAuthenticatedFacebookPage = async (tokens: FacebookConnectionTokens): Promise<FacebookPageProfile> => {
  const url = createGraphUrl('/me/accounts')
  url.searchParams.set('fields', 'id,name,access_token,tasks')
  url.searchParams.set('access_token', tokens.accessToken)

  const response = await readFacebookJson<FacebookAccountsResponse>(await fetch(url))
  const page = response.data?.find(
    (candidate) =>
      candidate.id && candidate.name && candidate.access_token && candidate.tasks?.includes('CREATE_CONTENT')
  )

  if (!page?.id || !page.name || !page.access_token) {
    throw new Error('No Facebook Page with CREATE_CONTENT permission was found')
  }

  return {
    accountName: page.name,
    platformUserId: page.id,
    pageAccessToken: page.access_token
  }
}

export const revokeFacebookToken = async (token: string): Promise<void> => {
  const url = createGraphUrl('/me/permissions')
  url.searchParams.set('access_token', token)

  await readFacebookJson<FacebookErrorResponse>(await fetch(url, { method: 'DELETE' }))
}
