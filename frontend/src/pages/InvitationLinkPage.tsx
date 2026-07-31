import { Check, X } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ApiClientError } from '../shared/api/client'
import { storeAuthReturnPath } from '../features/auth/model/authReturnPath'
import { useMeQuery } from '../features/auth/model/authQueries'
import {
  useAcceptLinkInvitationMutation,
  useLinkInvitationPreviewQuery,
  useRejectLinkInvitationMutation,
} from '../features/invitation/model/invitationQueries'
import { PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

export function InvitationLinkPage() {
  const params = useParams()
  const navigate = useNavigate()
  const token = params.token
  const meQuery = useMeQuery()
  const previewQuery = useLinkInvitationPreviewQuery(token)
  const acceptMutation = useAcceptLinkInvitationMutation(token)
  const rejectMutation = useRejectLinkInvitationMutation(token)

  if (meQuery.data && !meQuery.data.user.nicknameConfirmed) {
    storeAuthReturnPath(`/invitations/${token}`)
    return <Navigate replace to="/onboarding" />
  }

  function handleAccept() {
    acceptMutation.mutate(undefined, {
      onSuccess: () => navigate('/dashboard', { replace: true }),
    })
  }

  return (
    <main className="product-page product-page--narrow flex flex-col">
      <PageHeader
        actions={<Link className="dashboard-text-button" to="/dashboard">대시보드로 돌아가기</Link>}
        description="초대받은 장부 정보를 확인하고 참여 여부를 결정하세요."
        title="초대 링크"
      />

      <SurfaceCard className="mt-6">
        {previewQuery.isLoading ? (
          <p className="text-slate-500">초대를 확인하는 중입니다.</p>
        ) : null}

        {previewQuery.isError ? (
          <p className="text-red-700">초대 링크를 불러오지 못했습니다.</p>
        ) : null}

        {previewQuery.data ? (
          <>
            <p className="text-sm font-medium text-emerald-700">공동 장부 초대</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">
              {previewQuery.data.ledgerName}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {previewQuery.data.inviter.nickname}님의 초대입니다. 링크는 {new Date(previewQuery.data.expiresAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}까지 유효합니다.
            </p>
            {previewQuery.data.authenticationRequired || (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) ? <Link className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white" onClick={() => storeAuthReturnPath(`/invitations/${token}`)} to="/login">로그인하고 확인하기</Link> : <div className="mt-6 grid grid-cols-2 gap-2"><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--wl-color-border)] text-sm font-semibold" disabled={rejectMutation.isPending} onClick={() => rejectMutation.mutate()} type="button"><X size={18} aria-hidden="true" />거절</button><button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white disabled:bg-slate-300" disabled={acceptMutation.isPending} onClick={handleAccept} type="button"><Check size={18} aria-hidden="true" />참여하기</button></div>}
          </>
        ) : null}
      </SurfaceCard>
    </main>
  )
}
