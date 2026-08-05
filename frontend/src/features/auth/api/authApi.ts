import { z } from 'zod'
import { apiRequest } from '../../../shared/api/client'
import { ledgerSummarySchema } from '../../ledger/api/ledgerApi'

export const currentUserSchema = z.object({
  id: z.number(),
  nickname: z.string(),
  nicknameConfirmed: z.boolean(),
  timezone: z.string(),
})
export type CurrentUser = z.infer<typeof currentUserSchema>

export const sessionResponseSchema = z.object({
  user: currentUserSchema,
  currentLedger: ledgerSummarySchema,
})
export type SessionResponse = z.infer<typeof sessionResponseSchema>

export type DevLoginRequest = {
  email: string
  nickname: string
}

export const loginResponseSchema = sessionResponseSchema.extend({
  accessToken: z.string(),
  expiresInSeconds: z.number(),
})
export type LoginResponse = z.infer<typeof loginResponseSchema>

export const kakaoLoginUrlResponseSchema = z.object({ loginUrl: z.string() })
export type KakaoLoginUrlResponse = z.infer<typeof kakaoLoginUrlResponseSchema>

export function devLogin(request: DevLoginRequest) {
  return apiRequest('/api/auth/dev-login', {
    method: 'POST',
    body: request,
    token: null,
    schema: loginResponseSchema,
  })
}

export function getKakaoLoginUrl() {
  return apiRequest('/api/auth/kakao/login-url', { token: null, schema: kakaoLoginUrlResponseSchema })
}

export function completeKakaoLogin(code: string) {
  return apiRequest('/api/auth/kakao/callback', {
    method: 'POST',
    body: { code },
    token: null,
    schema: loginResponseSchema,
  })
}

export function getMe() {
  return apiRequest('/api/me', { schema: sessionResponseSchema })
}

export type ProfileRequest = { nickname: string; timezone: string }
export function updateProfile(request: ProfileRequest) {
  return apiRequest('/api/me/profile', { method: 'PATCH', body: request, schema: currentUserSchema })
}

export function refreshSession() {
  return apiRequest('/api/auth/refresh', {
    method: 'POST',
    token: null,
    retryAfterRefresh: false,
    schema: loginResponseSchema,
  })
}

export function logout() {
  return apiRequest<void>('/api/auth/logout', {
    method: 'POST',
  })
}
