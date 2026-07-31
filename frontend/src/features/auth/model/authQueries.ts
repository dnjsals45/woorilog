import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from '../../../shared/api/client'
import {
  completeKakaoLogin,
  devLogin,
  getMe,
  logout,
  refreshSession,
  updateProfile,
  type DevLoginRequest,
  type ProfileRequest,
} from '../api/authApi'

export const authQueryKeys = {
  me: ['auth', 'me'] as const,
  bootstrap: ['auth', 'bootstrap'] as const,
}

export function useSessionBootstrapQuery() {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: authQueryKeys.bootstrap,
    queryFn: async () => {
      const data = await refreshSession()
      setAccessToken(data.accessToken)
      queryClient.setQueryData(authQueryKeys.me, {
        user: data.user,
        currentLedger: data.currentLedger,
      })
      return data
    },
    enabled: !getAccessToken(),
    retry: false,
  })
}

export function useMeQuery() {
  return useQuery({
    queryKey: authQueryKeys.me,
    queryFn: getMe,
    enabled: Boolean(getAccessToken()),
    retry: false,
  })
}

export function useDevLoginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: DevLoginRequest) => devLogin(request),
    onSuccess: (data) => {
      setAccessToken(data.accessToken)
      queryClient.setQueryData(authQueryKeys.me, {
        user: data.user,
        currentLedger: data.currentLedger,
      })
    },
  })
}

export function useKakaoLogin() {
  const queryClient = useQueryClient()

  return useCallback(async (code: string) => {
    const data = await completeKakaoLogin(code)
      setAccessToken(data.accessToken)
      queryClient.setQueryData(authQueryKeys.me, {
        user: data.user,
        currentLedger: data.currentLedger,
      })
    return data
  }, [queryClient])
}

export function useLogoutMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearAccessToken()
      queryClient.clear()
    },
  })
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (request: ProfileRequest) => updateProfile(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: authQueryKeys.me }),
  })
}
