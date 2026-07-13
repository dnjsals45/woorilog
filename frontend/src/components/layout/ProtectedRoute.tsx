import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getAccessToken } from '../../shared/api/client'
import { useSessionBootstrapQuery } from '../../features/auth/model/authQueries'

export function ProtectedRoute() {
  const location = useLocation()
  const refreshQuery = useSessionBootstrapQuery()

  if (getAccessToken() || refreshQuery.isSuccess) {
    return <Outlet />
  }

  if (refreshQuery.isLoading) {
    return <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] text-sm font-bold text-slate-500">세션을 확인하는 중입니다.</main>
  }

  if (refreshQuery.isError) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />
  }

  return null
}
