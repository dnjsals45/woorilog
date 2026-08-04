import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useMeQuery, useUpdateProfileMutation } from '../features/auth/model/authQueries'
import { clearAuthReturnPath, getAuthReturnPath } from '../features/auth/model/authReturnPath'
import { copyText } from '../shared/lib/clipboard'
import { createInvitationLink } from '../features/invitation/api/invitationApi'
import {
  useCreateInvitationLinkMutation,
  useLinkInvitationPreviewQuery,
} from '../features/invitation/model/invitationQueries'
import { useCreateSharedLedgerMutation } from '../features/ledger/model/ledgerQueries'
import { OnboardingPage } from './OnboardingPage'
import { SharedLedgerCreatePage } from './SharedLedgerCreatePage'

export function OnboardingRoute() {
  const me = useMeQuery()
  const mutation = useUpdateProfileMutation()
  const invitationReturnPath = getAuthReturnPath().startsWith('/invitations/') ? getAuthReturnPath() : null
  // '/invitations/:token' 과 '/invitations/links/:token' 두 경로 형태 모두에서 토큰만 뽑아냅니다.
  const invitationToken = invitationReturnPath?.split(/[?#]/)[0].split('/').filter(Boolean).pop()
  const invitationPreview = useLinkInvitationPreviewQuery(invitationToken)
  if (me.isLoading) return <OnboardingPage isLoading />
  if (me.data?.user.nicknameConfirmed) return <Navigate replace to={getAuthReturnPath()} />
  return <OnboardingPage
    error={mutation.isError ? '입력한 이름을 확인한 뒤 다시 시도해주세요.' : null}
    initialNickname={me.data?.user.nickname}
    inviterNickname={invitationPreview.data?.inviter.nickname}
    invitationReturnPath={invitationReturnPath}
    isLoading={mutation.isPending}
    onConfirm={async (request) => {
      await mutation.mutateAsync(request)
    }}
    onLeave={() => clearAuthReturnPath()}
  />
}

export function SharedLedgerCreateRoute() {
  const createLedger = useCreateSharedLedgerMutation()
  const navigate = useNavigate()
  const [ledger, setLedger] = useState<{ id: number; name: string } | null>(null)
  const [invitation, setInvitation] = useState<{ url: string; expiresAt: string } | null>(null)
  const [invitationFailed, setInvitationFailed] = useState(false)
  // 재생성만 이 훅으로 처리합니다. 최초 링크는 방금 만든 ledgerId를 바로 써야 해서 아래에서 API를 직접 호출합니다.
  const regenerateInvitation = useCreateInvitationLinkMutation(ledger?.id)

  function toInvitation(created: { url: string; expiresAt: string }) {
    return { url: new URL(created.url, window.location.origin).toString(), expiresAt: created.expiresAt }
  }

  return <SharedLedgerCreatePage
    createError={createLedger.isError ? '가계부 이름, 예산과 시작일을 확인해주세요.' : null}
    invitation={invitation}
    invitationError={invitationFailed || regenerateInvitation.isError ? '초대 링크를 만들지 못했습니다. 다시 시도해주세요.' : null}
    isCreating={createLedger.isPending}
    isCreatingInvitation={regenerateInvitation.isPending}
    ledger={ledger}
    onCopyInvitation={(url) => copyText(url)}
    onCreate={async (request) => {
      const created = await createLedger.mutateAsync(request)
      setLedger({ id: created.ledger.id, name: created.ledger.name })
      try {
        const link = await createInvitationLink(created.ledger.id)
        setInvitation(toInvitation(link))
      } catch {
        setInvitationFailed(true)
      }
    }}
    onDone={() => ledger && navigate(`/ledgers/${ledger.id}/settings`, { replace: true })}
    onRegenerateInvitation={async () => {
      setInvitationFailed(false)
      const created = await regenerateInvitation.mutateAsync()
      setInvitation(toInvitation(created))
    }}
  />
}
