const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
const ACCESS_TOKEN_KEY = 'woorilog.accessToken'
let memoryAccessToken: string | null = null

export type ApiErrorBody = {
  code: string
  message: string
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, body: ApiErrorBody) {
    super(body.message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = body.code
  }
}

export function getAccessToken() {
  if (typeof window.localStorage === 'undefined') {
    return memoryAccessToken
  }

  return window.localStorage.getItem(ACCESS_TOKEN_KEY) ?? memoryAccessToken
}

export function setAccessToken(token: string) {
  memoryAccessToken = token

  if (typeof window.localStorage !== 'undefined') {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, token)
  }
}

export function clearAccessToken() {
  memoryAccessToken = null

  if (typeof window.localStorage !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY)
  }
}

type ApiRequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token = getAccessToken() }: ApiRequestOptions = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  const data = text ? JSON.parse(text) : undefined

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearAccessToken()
    }

    const errorBody: ApiErrorBody = data ?? {
      code: 'REQUEST_FAILED',
      message: '요청에 실패했습니다.',
    }
    throw new ApiClientError(response.status, errorBody)
  }

  return data as T
}
