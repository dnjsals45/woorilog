import { apiRequest } from '../../../shared/api/client'
import type { LedgerSummary } from '../../ledger/api/ledgerApi'

export type CurrentUser = {
  id: number
  email: string | null
  nickname: string
}

export type SessionResponse = {
  user: CurrentUser
  currentLedger: LedgerSummary
}

export type DevLoginRequest = {
  email: string
  nickname: string
}

export type LoginResponse = SessionResponse & {
  accessToken: string
  expiresInSeconds: number
}

export type KakaoLoginUrlResponse = {
  loginUrl: string
}

export function devLogin(request: DevLoginRequest) {
  return apiRequest<LoginResponse>('/api/auth/dev-login', {
    method: 'POST',
    body: request,
    token: null,
  })
}

export function getKakaoLoginUrl() {
  return apiRequest<KakaoLoginUrlResponse>('/api/auth/kakao/login-url', { token: null })
}

export function completeKakaoLogin(code: string) {
  return apiRequest<LoginResponse>('/api/auth/kakao/callback', {
    method: 'POST',
    body: { code },
    token: null,
  })
}

export function getMe() {
  return apiRequest<SessionResponse>('/api/me')
}

export function refreshSession() {
  return apiRequest<LoginResponse>('/api/auth/refresh', {
    method: 'POST',
    token: null,
    retryAfterRefresh: false,
  })
}

export function logout() {
  return apiRequest<void>('/api/auth/logout', {
    method: 'POST',
  })
}
