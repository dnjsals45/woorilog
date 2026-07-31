import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useMeQuery } from '../../features/auth/model/authQueries'
import { storeAuthReturnPath } from '../../features/auth/model/authReturnPath'

export function ProfileGate() {
  const me = useMeQuery()
  const location = useLocation()
  if (me.isLoading) return <main className="flex min-h-dvh items-center justify-center text-sm font-bold text-[var(--wl-color-text-secondary)]">프로필을 확인하는 중입니다.</main>
  if (me.data && !me.data.user.nicknameConfirmed) {
    storeAuthReturnPath(`${location.pathname}${location.search}${location.hash}`)
    return <Navigate replace to="/onboarding" />
  }
  return <Outlet />
}
