import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearAuthReturnPath, getAuthReturnPath } from '../model/authReturnPath'

export function AuthReturnRedirect() {
  const navigate = useNavigate()
  const [returnPath] = useState(() => getAuthReturnPath())

  useEffect(() => {
    clearAuthReturnPath()
    navigate(returnPath, { replace: true })
  }, [navigate, returnPath])

  return <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] text-sm font-bold text-slate-500">로그인 후 이동 중입니다.</main>
}
