import type { ZodType, infer as ZodInfer } from 'zod'
import { checkResponse } from './contract'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'
let memoryAccessToken: string | null = null
let refreshPromise: Promise<string | null> | null = null

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
  return memoryAccessToken
}

export function setAccessToken(token: string) {
  memoryAccessToken = token
}

export function clearAccessToken() {
  memoryAccessToken = null
}

type ApiRequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
  retryAfterRefresh?: boolean
  /** 응답 모양. 넘기면 실제 응답을 검사하고 반환 타입도 여기서 뽑습니다. `shared/api/contract.ts` 참고. */
  schema?: ZodType
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    }).then(async (response) => {
      if (!response.ok) {
        clearAccessToken()
        return null
      }
      const data = await response.json() as { accessToken: string }
      setAccessToken(data.accessToken)
      return data.accessToken
    }).finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/* schema 를 넘기면 반환 타입은 schema 에서 나오고, 넘기지 않으면 예전처럼 타입 인자를 씁니다.
 * 15개 API 모듈을 한 번에 옮기지 않고 하나씩 붙일 수 있게 두 방식을 함께 둡니다. */
export async function apiRequest<S extends ZodType>(
  path: string,
  options: ApiRequestOptions & { schema: S },
): Promise<ZodInfer<S>>
export async function apiRequest<T>(path: string, options?: ApiRequestOptions): Promise<T>
export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token = getAccessToken(), retryAfterRefresh = true, schema }: ApiRequestOptions = {},
): Promise<T> {
  const isFormData = body instanceof FormData
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: 'include',
    headers: {
      ...(body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  })

  if (response.status === 401 && token && retryAfterRefresh && path !== '/api/auth/refresh') {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      return apiRequest<T>(path, { method, body, token: refreshedToken, retryAfterRefresh: false, schema })
    }
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : undefined
  } catch {
    data = undefined
  }

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearAccessToken()
    }

    const errorBody: ApiErrorBody = (data && typeof data === 'object' ? data : undefined) as ApiErrorBody ?? {
      code: 'REQUEST_FAILED',
      message: '요청에 실패했습니다.',
    }
    throw new ApiClientError(response.status, errorBody)
  }

  if (schema) {
    checkResponse(schema, data, path, method)
  }

  return data as T
}
