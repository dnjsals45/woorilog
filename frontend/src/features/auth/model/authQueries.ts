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
  type DevLoginRequest,
} from '../api/authApi'

export const authQueryKeys = {
  me: ['auth', 'me'] as const,
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

export function useKakaoLoginMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: completeKakaoLogin,
    onSuccess: (data) => {
      setAccessToken(data.accessToken)
      queryClient.setQueryData(authQueryKeys.me, {
        user: data.user,
        currentLedger: data.currentLedger,
      })
    },
  })
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
