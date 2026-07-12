import { Check, LinkIcon } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiClientError } from '../shared/api/client'
import { useMeQuery } from '../features/auth/model/authQueries'
import {
  useAcceptLinkInvitationMutation,
  useLinkInvitationPreviewQuery,
} from '../features/invitation/model/invitationQueries'

export function InvitationLinkPage() {
  const params = useParams()
  const navigate = useNavigate()
  const token = params.token
  const meQuery = useMeQuery()
  const previewQuery = useLinkInvitationPreviewQuery(token)
  const acceptMutation = useAcceptLinkInvitationMutation(token)

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  function handleAccept() {
    acceptMutation.mutate(undefined, {
      onSuccess: () => navigate('/dashboard', { replace: true }),
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-5 py-6 sm:px-8">
      <header className="border-b border-slate-200 pb-6">
        <Link className="text-sm font-medium text-emerald-700" to="/dashboard">
          대시보드로 돌아가기
        </Link>
        <p className="wl-page-header-label mt-5">Invitation</p>
        <div className="mt-2 flex items-center gap-2 text-slate-950">
          <LinkIcon size={26} className="text-[var(--wl-color-primary)]" aria-hidden="true" />
          <h1 className="text-3xl font-bold tracking-tight">초대 링크</h1>
        </div>
      </header>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {previewQuery.isLoading ? (
          <p className="text-slate-500">초대를 확인하는 중입니다.</p>
        ) : null}

        {previewQuery.isError ? (
          <p className="text-red-700">초대 링크를 불러오지 못했습니다.</p>
        ) : null}

        {previewQuery.data ? (
          <>
            <p className="text-sm font-medium text-emerald-700">
              {previewQuery.data.ledgerType === 'GROUP' ? '공동 장부' : '개인 장부'}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {previewQuery.data.ledgerName}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {previewQuery.data.inviterNickname}님의 초대입니다.
            </p>
            <button
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={
                acceptMutation.isPending ||
                previewQuery.data.expired ||
                previewQuery.data.status !== 'PENDING'
              }
              onClick={handleAccept}
              type="button"
            >
              <Check size={18} aria-hidden="true" />
              참여하기
            </button>
            {previewQuery.data.expired || previewQuery.data.status !== 'PENDING' ? (
              <p className="mt-3 text-sm text-slate-500">
                이미 처리되었거나 만료된 초대입니다.
              </p>
            ) : null}
          </>
        ) : null}
      </section>
    </main>
  )
}
