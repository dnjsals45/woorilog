import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useMeQuery, useUpdateProfileMutation } from '../features/auth/model/authQueries'
import { clearAuthReturnPath, getAuthReturnPath } from '../features/auth/model/authReturnPath'
import { useCreateInvitationLinkMutation } from '../features/invitation/model/invitationQueries'
import {
  useCreateSharedLedgerMutation,
  useLeaveLedgerMutation,
  useLedgerMembersQuery,
  useLedgersQuery,
  useRemoveLedgerMemberMutation,
  useRenameLedgerMutation,
  useTransferLedgerOwnershipMutation,
} from '../features/ledger/model/ledgerQueries'
import { OnboardingPage } from './OnboardingPage'
import { SharedLedgerCreatePage } from './SharedLedgerCreatePage'
import { LedgerSettingsPage } from './LedgerSettingsPage'

export function OnboardingRoute() {
  const me = useMeQuery()
  const mutation = useUpdateProfileMutation()
  const navigate = useNavigate()
  if (me.isLoading) return <OnboardingPage isLoading />
  if (me.data?.user.nicknameConfirmed) return <Navigate replace to={getAuthReturnPath()} />
  return <OnboardingPage
    error={mutation.isError ? '입력한 이름과 시간대를 확인한 뒤 다시 시도해주세요.' : null}
    initialNickname={me.data?.user.nickname}
    invitationReturnPath={getAuthReturnPath().startsWith('/invitations/') ? getAuthReturnPath() : null}
    isLoading={mutation.isPending}
    onConfirm={async (request) => {
      await mutation.mutateAsync(request)
      const returnPath = getAuthReturnPath()
      clearAuthReturnPath()
      navigate(returnPath, { replace: true })
    }}
  />
}

export function SharedLedgerCreateRoute() {
  const mutation = useCreateSharedLedgerMutation()
  const navigate = useNavigate()
  return <SharedLedgerCreatePage
    error={mutation.isError ? '장부 이름, 예산과 시작일을 확인해주세요.' : null}
    isLoading={mutation.isPending}
    onCreate={async (request) => {
      const created = await mutation.mutateAsync(request)
      navigate(`/ledgers/${created.ledger.id}/settings`, { replace: true })
    }}
  />
}

export function LedgerSettingsRoute() {
  const { ledgerId } = useParams()
  const me = useMeQuery()
  const ledgers = useLedgersQuery()
  const requestedLedgerId = Number(ledgerId)
  const current = ledgers.data?.ledgers.find((ledger) => ledger.id === requestedLedgerId)
  const members = useLedgerMembersQuery(current?.id)
  const rename = useRenameLedgerMutation(current?.id)
  const remove = useRemoveLedgerMemberMutation(current?.id)
  const leave = useLeaveLedgerMutation(current?.id)
  const invite = useCreateInvitationLinkMutation(current?.id)
  const transferOwnership = useTransferLedgerOwnershipMutation(current?.id)
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null)
  const viewer = members.data?.find((member) => member.userId === me.data?.user.id)
  if (!Number.isFinite(requestedLedgerId)) return <Navigate replace to="/dashboard" />
  if (current?.type === 'PERSONAL') return <Navigate replace to="/settings" />
  return <LedgerSettingsPage
    error={ledgers.isError || members.isError ? '장부 정보를 다시 불러와주세요.' : null}
    invitationUrl={invitationUrl}
    isLoading={ledgers.isLoading || members.isLoading}
    ledger={current ? { id: current.id, name: current.name, role: viewer?.role ?? 'MEMBER', accessState: viewer?.status === 'FORMER' ? 'FORMER_READ_ONLY' : 'ACTIVE' } : undefined}
    members={members.data?.map((member) => ({ id: member.userId, nickname: member.nickname, role: member.role, accessState: member.status === 'FORMER' ? 'FORMER_READ_ONLY' : 'ACTIVE' }))}
    onCopyInvitation={(url) => void navigator.clipboard.writeText(url)}
    onCreateInvitation={async () => {
      const created = await invite.mutateAsync()
      setInvitationUrl(new URL(created.url, window.location.origin).toString())
    }}
    onLeave={async () => { await leave.mutateAsync(); window.location.assign('/dashboard') }}
    onRemoveMember={async (userId) => { await remove.mutateAsync(userId) }}
    onTransferOwnership={async (userId) => { await transferOwnership.mutateAsync(userId) }}
    onRename={async (name) => { await rename.mutateAsync(name) }}
  />
}
