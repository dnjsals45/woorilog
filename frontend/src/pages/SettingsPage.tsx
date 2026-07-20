import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Archive, BookOpen, Check, Copy, LinkIcon, LogOut, Mail, Send, Settings, UserMinus, Users, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiClientError } from '../shared/api/client'
import { useLogoutMutation, useMeQuery } from '../features/auth/model/authQueries'
import { useArchiveLedgerMutation, useLeaveLedgerMutation, useLedgerMembersQuery, useLedgersQuery, useRemoveLedgerMemberMutation, useRenameLedgerMutation } from '../features/ledger/model/ledgerQueries'
import {
  useCancelInvitationMutation,
  useCreateInvitationLinkMutation,
  useInvitableUserQuery,
  useInvitationResponseMutation,
  useInviteUserMutation,
  useLedgerInvitationsQuery,
  usePendingInvitationsQuery,
} from '../features/invitation/model/invitationQueries'
import type { InvitationStatus, InvitationType } from '../features/invitation/api/invitationApi'

export function SettingsPage() {
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const logoutMutation = useLogoutMutation()
  const ledgersQuery = useLedgersQuery()
  const currentLedger =
    ledgersQuery.data?.ledgers.find(
      (ledger) => ledger.id === ledgersQuery.data.currentLedgerId,
    ) ?? meQuery.data?.currentLedger
  const canManageInvitations =
    currentLedger?.type === 'GROUP' && currentLedger.ownerId === meQuery.data?.user.id
  const [email, setEmail] = useState('')
  const [searchedEmail, setSearchedEmail] = useState('')
  const [createdLinkToken, setCreatedLinkToken] = useState<string | null>(null)
  const membersQuery = useLedgerMembersQuery(currentLedger?.id)
  const renameLedgerMutation = useRenameLedgerMutation(currentLedger?.id)
  const archiveLedgerMutation = useArchiveLedgerMutation(currentLedger?.id)
  const removeMemberMutation = useRemoveLedgerMemberMutation(currentLedger?.id)
  const leaveLedgerMutation = useLeaveLedgerMutation(currentLedger?.id)
  const invitableUserQuery = useInvitableUserQuery(
    currentLedger?.id,
    searchedEmail,
    Boolean(searchedEmail),
  )
  const ledgerInvitationsQuery = useLedgerInvitationsQuery(
    canManageInvitations ? currentLedger?.id : undefined,
  )
  const pendingInvitationsQuery = usePendingInvitationsQuery()
  const inviteUserMutation = useInviteUserMutation(currentLedger?.id)
  const createLinkMutation = useCreateInvitationLinkMutation(currentLedger?.id)
  const cancelInvitationMutation = useCancelInvitationMutation(currentLedger?.id)
  const acceptInvitationMutation = useInvitationResponseMutation('accept')
  const rejectInvitationMutation = useInvitationResponseMutation('reject')

  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate to="/login" replace />
  }

  const invitationLink = createdLinkToken
    ? `${window.location.origin}/invitations/links/${createdLinkToken}`
    : null

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSearchedEmail(email.trim())
  }

  function handleCreateLink() {
    createLinkMutation.mutate(7, {
      onSuccess: (invitation) => setCreatedLinkToken(invitation.token),
    })
  }

  function handleRenameLedger(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = String(new FormData(event.currentTarget).get('ledgerName') ?? '').trim()
    if (name) renameLedgerMutation.mutate(name)
  }

  function handleArchiveLedger() {
    if (!window.confirm('이 장부를 보관할까요? 보관하면 장부 목록에서 더 이상 보이지 않습니다.')) return
    archiveLedgerMutation.mutate(undefined, {
      onSuccess: () => navigate('/dashboard', { replace: true }),
    })
  }

  function handleLeaveLedger() {
    if (!window.confirm('이 공동 장부에서 나갈까요? 다시 참여하려면 새 초대가 필요합니다.')) return
    leaveLedgerMutation.mutate(undefined, {
      onSuccess: () => navigate('/dashboard', { replace: true }),
    })
  }

  function handleRemoveMember(userId: number, nickname: string) {
    if (!window.confirm(`${nickname} 님을 이 장부에서 내보낼까요?`)) return
    removeMemberMutation.mutate(userId)
  }

  function handleLogout() {
    logoutMutation.mutate(undefined, {
      onSettled: () => navigate('/login', { replace: true }),
    })
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[1200px] flex-col px-4 py-4 sm:px-6 md:p-8 lg:p-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="wl-page-header-label">Workspace</p>
          <div className="mt-2 flex items-center gap-2 text-slate-950">
            <Settings size={26} className="text-[var(--wl-color-primary)]" aria-hidden="true" />
            <h1 className="text-3xl font-bold tracking-tight">설정</h1>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {currentLedger?.name ?? '현재 장부'}의 초대와 받은 초대를 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3"><Link className="text-sm font-bold text-[var(--wl-color-primary-dark)]" to="/dashboard">대시보드로 돌아가기</Link><button aria-label="설정에서 로그아웃" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50" disabled={logoutMutation.isPending} onClick={handleLogout} type="button"><LogOut size={16} />{logoutMutation.isPending ? '로그아웃 중...' : '로그아웃'}</button></div>
      </header>

      <section aria-label="장부 기본 설정" className="mt-6 grid gap-5 lg:grid-cols-2">
        <article className="rounded-[1.5rem] border border-[var(--wl-color-border)] bg-white p-6 shadow-[var(--wl-shadow-card)]">
          <div className="flex items-center gap-2"><BookOpen className="text-[var(--wl-color-primary)]" size={21} /><h2 className="text-lg font-bold">장부 정보</h2></div>
          <dl className="mt-6 divide-y divide-slate-100 text-sm"><div className="flex justify-between py-3"><dt className="text-slate-500">장부 이름</dt><dd className="font-bold">{currentLedger?.name ?? '현재 장부'}</dd></div><div className="flex justify-between py-3"><dt className="text-slate-500">장부 유형</dt><dd className="font-bold">{currentLedger?.type === 'GROUP' ? '공동 장부' : '개인 장부'}</dd></div></dl>
          {currentLedger ? currentLedger.ownerId === meQuery.data?.user.id ? <><form className="mt-5 flex gap-2" key={currentLedger.id} onSubmit={handleRenameLedger}><label className="sr-only" htmlFor="ledger-name">장부 이름 변경</label><input className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-base" defaultValue={currentLedger.name} id="ledger-name" name="ledgerName" required /><button className="rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white disabled:bg-slate-300" disabled={renameLedgerMutation.isPending} type="submit">이름 저장</button></form><button className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-red-600" disabled={archiveLedgerMutation.isPending} onClick={handleArchiveLedger} type="button"><Archive size={17} />장부 보관</button></> : <button className="mt-5 inline-flex min-h-10 items-center gap-2 text-sm font-bold text-red-600" disabled={leaveLedgerMutation.isPending} onClick={handleLeaveLedger} type="button"><UserMinus size={17} />공동 장부 나가기</button> : null}
        </article>
        <article className="rounded-[1.5rem] border border-[var(--wl-color-border)] bg-white p-6 shadow-[var(--wl-shadow-card)]">
          <div className="flex items-center gap-2"><Users className="text-[var(--wl-color-primary)]" size={21} /><h2 className="text-lg font-bold">함께 쓰는 멤버</h2></div>
          <div className="mt-5 space-y-3">{membersQuery.data?.map((member) => <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3" key={member.userId}><span className="font-semibold">{member.nickname}</span><span className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400">{member.userId === currentLedger?.ownerId ? '소유자' : '멤버'}</span>{currentLedger && currentLedger.ownerId === meQuery.data?.user.id && member.userId !== currentLedger.ownerId ? <button aria-label={`${member.nickname} 내보내기`} className="flex size-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50" disabled={removeMemberMutation.isPending} onClick={() => handleRemoveMember(member.userId, member.nickname)} type="button"><UserMinus size={16} /></button> : null}</span></div>)}{!membersQuery.data?.length ? <p className="text-sm text-slate-500">참여 중인 멤버가 없습니다.</p> : null}</div>
        </article>
      </section>

      <section className="grid gap-4 py-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-950">
            <Mail size={20} aria-hidden="true" />
            <h2 className="text-lg font-semibold">장부 초대</h2>
          </div>

          {!canManageInvitations ? (
            <p className="mt-4 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
              공동 장부의 소유자만 초대를 보낼 수 있습니다.
            </p>
          ) : (
            <>
              <form className="mt-5 flex flex-col gap-2 sm:flex-row" onSubmit={handleSearch}>
                <label className="sr-only" htmlFor="invite-email">
                  이메일
                </label>
                <input
                  className="h-11 flex-1 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
                  id="invite-email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="email@example.com"
                  type="email"
                  value={email}
                />
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="submit"
                >
                  <Mail size={18} aria-hidden="true" />
                  찾기
                </button>
              </form>

              {invitableUserQuery.isError ? (
                <p className="mt-3 text-sm text-red-700">
                  초대할 사용자를 찾지 못했습니다.
                </p>
              ) : null}

              {invitableUserQuery.data ? (
                <div className="mt-4 rounded-md border border-slate-200 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      <span className="block font-medium text-slate-950">
                        {invitableUserQuery.data.user.nickname}
                      </span>
                      <span className="text-sm text-slate-500">
                        {invitableUserQuery.data.user.email}
                      </span>
                    </span>
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      disabled={!invitableUserQuery.data.invitable || inviteUserMutation.isPending}
                      onClick={() => inviteUserMutation.mutate(invitableUserQuery.data.user.id)}
                      type="button"
                    >
                      <Send size={18} aria-hidden="true" />
                      초대
                    </button>
                  </div>
                  {invitableUserQuery.data.reason ? (
                    <p className="mt-2 text-sm text-slate-500">
                      {invitableReasonLabel(invitableUserQuery.data.reason)}
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-6 border-t border-slate-200 pt-5">
                <button
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-950"
                  disabled={createLinkMutation.isPending}
                  onClick={handleCreateLink}
                  type="button"
                >
                  <LinkIcon size={18} aria-hidden="true" />
                  링크 만들기
                </button>
                {invitationLink ? (
                  <div className="mt-3 flex flex-col gap-2 rounded-md bg-slate-50 p-3 sm:flex-row sm:items-center">
                    <input
                      className="h-10 flex-1 rounded-md border border-slate-300 px-3 text-sm text-slate-700"
                      readOnly
                      value={invitationLink}
                    />
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white"
                      onClick={() => navigator.clipboard?.writeText(invitationLink)}
                      type="button"
                    >
                      <Copy size={18} aria-hidden="true" />
                      복사
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">받은 초대</h2>
          <div className="mt-4 space-y-3">
            {pendingInvitationsQuery.data?.length ? (
              pendingInvitationsQuery.data.map((invitation) => (
                <div className="rounded-md border border-slate-200 p-3" key={invitation.id}>
                  <p className="font-medium text-slate-950">{invitation.ledgerName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {invitation.inviter.nickname}님의 초대
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white disabled:bg-slate-300"
                      disabled={acceptInvitationMutation.isPending}
                      onClick={() => acceptInvitationMutation.mutate(invitation.id)}
                      type="button"
                    >
                      <Check size={18} aria-hidden="true" />
                      수락
                    </button>
                    <button
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                      disabled={rejectInvitationMutation.isPending}
                      onClick={() => rejectInvitationMutation.mutate(invitation.id)}
                      type="button"
                    >
                      <X size={18} aria-hidden="true" />
                      거절
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
                받은 초대가 없습니다.
              </p>
            )}
          </div>
        </div>
      </section>

      {canManageInvitations ? (
        <section className="rounded-[1.5rem] border border-[var(--wl-color-border)] bg-white p-5 shadow-[var(--wl-shadow-card)]">
          <h2 className="text-lg font-semibold text-slate-950">보낸 초대</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {ledgerInvitationsQuery.data?.length ? (
              ledgerInvitationsQuery.data.map((invitation) => (
                <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between" key={invitation.id}>
                  <span>
                    <span className="block font-medium text-slate-950">
                      {invitation.invitee?.nickname ?? '초대 링크'}
                    </span>
                    <span className="text-sm text-slate-500">
                      {invitationTypeLabel(invitation.type)} · {invitationStatusLabel(invitation.status)}
                    </span>
                  </span>
                  {invitation.status === 'PENDING' ? (
                    <button
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                      disabled={cancelInvitationMutation.isPending}
                      onClick={() => cancelInvitationMutation.mutate(invitation.id)}
                      type="button"
                    >
                      <X size={18} aria-hidden="true" />
                      취소
                    </button>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="py-4 text-sm text-slate-500">보낸 초대가 없습니다.</p>
            )}
          </div>
        </section>
      ) : null}

    </main>
  )
}

function invitableReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    SELF_INVITATION: '본인은 초대할 수 없습니다.',
    ALREADY_MEMBER: '이미 장부에 참여 중입니다.',
    PENDING_INVITATION: '이미 대기 중인 초대가 있습니다.',
  }

  return labels[reason] ?? '초대할 수 없는 사용자입니다.'
}

function invitationTypeLabel(type: InvitationType) {
  return type === 'LINK' ? '링크 초대' : '사용자 초대'
}

function invitationStatusLabel(status: InvitationStatus) {
  const labels: Record<InvitationStatus, string> = {
    PENDING: '대기 중',
    ACCEPTED: '수락됨',
    REJECTED: '거절됨',
    CANCELLED: '취소됨',
    EXPIRED: '만료됨',
  }

  return labels[status]
}
