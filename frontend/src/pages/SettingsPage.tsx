import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Archive, BookOpen, Check, Copy, LinkIcon, Mail, Pause, Play, Repeat, Send, Settings, UserMinus, Users, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ApiClientError } from '../shared/api/client'
import { useMeQuery } from '../features/auth/model/authQueries'
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
import { useCategoriesQuery } from '../features/category/model/categoryQueries'
import {
  useCreateRecurringTemplateMutation,
  useGenerateRecurringTransactionsMutation,
  useRecurringDueQuery,
  useRecurringPauseMutation,
  useRecurringTemplatesQuery,
  useUpdateRecurringTemplateMutation,
} from '../features/recurring/model/recurringQueries'
import type { RecurringFrequency } from '../features/recurring/api/recurringApi'
import type { TransactionType } from '../features/transaction/api/transactionApi'
import { formatBudgetMonth, formatDateInput } from '../shared/lib/date'
import { formatWon } from '../shared/lib/money'

export function SettingsPage() {
  const navigate = useNavigate()
  const meQuery = useMeQuery()
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
  const [recurringType, setRecurringType] = useState<TransactionType>('EXPENSE')
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null)
  const [asOfDate, setAsOfDate] = useState(formatDateInput())
  const [settingsTab, setSettingsTab] = useState<'ledger' | 'recurring'>('ledger')
  const budgetMonth = formatBudgetMonth(new Date(asOfDate))
  const categoriesQuery = useCategoriesQuery(currentLedger?.id)
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
  const recurringTemplatesQuery = useRecurringTemplatesQuery(currentLedger?.id)
  const recurringDueQuery = useRecurringDueQuery(currentLedger?.id, asOfDate)
  const createRecurringMutation = useCreateRecurringTemplateMutation(currentLedger?.id)
  const pauseRecurringMutation = useRecurringPauseMutation('pause')
  const resumeRecurringMutation = useRecurringPauseMutation('resume')
  const generateRecurringMutation = useGenerateRecurringTransactionsMutation(
    currentLedger?.id,
    budgetMonth,
  )
  const updateRecurringMutation = useUpdateRecurringTemplateMutation(editingTemplateId ?? undefined)
  const editingTemplate = recurringTemplatesQuery.data?.find((template) => template.id === editingTemplateId)

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

  function handleCreateRecurring(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const categoryId = Number(formData.get('categoryId'))
    const endDate = String(formData.get('endDate') ?? '')

    const request = {
      type: recurringType,
      amount: Number(formData.get('amount') ?? 0),
      categoryId: categoryId ? categoryId : null,
      memo: String(formData.get('memo') ?? '') || null,
      payerUserId: Number(formData.get('payerUserId')) || null,
      frequency: String(formData.get('frequency')) as RecurringFrequency,
      startDate: String(formData.get('startDate')),
      endDate: endDate || null,
    }
    const onSuccess = () => {
      setEditingTemplateId(null)
      event.currentTarget.reset()
    }

    if (editingTemplateId) {
      updateRecurringMutation.mutate(request, { onSuccess })
    } else {
      createRecurringMutation.mutate(request, { onSuccess })
    }
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

  function startRecurringEdit(templateId: number) {
    const template = recurringTemplatesQuery.data?.find((item) => item.id === templateId)
    if (template) {
      setRecurringType(template.type)
      setEditingTemplateId(template.id)
    }
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
        <Link className="text-sm font-bold text-[var(--wl-color-primary-dark)]" to="/dashboard">대시보드로 돌아가기</Link>
      </header>

      <div className="mt-6 rounded-xl border border-slate-200/30 bg-slate-100 p-1 shadow-inner sm:hidden" role="tablist" aria-label="설정 메뉴">
        <div className="grid grid-cols-2 gap-1">
          {([['ledger', '가계부'], ['recurring', '정기 거래']] as const).map(([value, label]) => (
            <button aria-controls={`${value}-panel`} aria-selected={settingsTab === value} className={`min-h-10 rounded-lg text-xs font-black transition ${settingsTab === value ? 'border border-slate-200/20 bg-white text-emerald-700 shadow-sm' : 'text-slate-500'}`} key={value} onClick={() => setSettingsTab(value)} role="tab" type="button">{label}</button>
          ))}
        </div>
      </div>
      <div className="mt-6 hidden border-b border-slate-200 sm:block" role="tablist" aria-label="설정 메뉴">
        <nav className="-mb-px flex gap-8">
          {([['ledger', '장부 기본 설정'], ['recurring', '반복 거래 설정']] as const).map(([value, label]) => (
            <button aria-controls={`${value}-panel`} aria-selected={settingsTab === value} className={`min-h-12 border-b-2 px-1.5 text-sm font-extrabold transition ${settingsTab === value ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'}`} key={value} onClick={() => setSettingsTab(value)} role="tab" type="button">{label}</button>
          ))}
        </nav>
      </div>

      <section aria-label="장부 기본 설정" className={`mt-6 grid gap-5 lg:grid-cols-2 ${settingsTab === 'ledger' ? '' : 'hidden'}`} id="ledger-panel" role="tabpanel">
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

      <section className={`grid gap-4 py-6 lg:grid-cols-[1.05fr_0.95fr] ${settingsTab === 'ledger' ? '' : 'hidden'}`}>
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
        <section className={`rounded-[1.5rem] border border-[var(--wl-color-border)] bg-white p-5 shadow-[var(--wl-shadow-card)] ${settingsTab === 'ledger' ? '' : 'hidden'}`}>
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

      <section aria-label="반복 거래 설정" className={`mt-6 rounded-[1.5rem] border border-[var(--wl-color-border)] bg-white p-6 shadow-[var(--wl-shadow-card)] ${settingsTab === 'recurring' ? '' : 'hidden'}`} id="recurring-panel" role="tabpanel">
        <div className="flex items-center gap-2 text-slate-950">
          <Repeat size={20} aria-hidden="true" />
          <h2 className="text-lg font-semibold">반복 거래</h2>
        </div>

        <form className="mt-5 grid gap-3 lg:grid-cols-6" key={editingTemplate?.id ?? 'new'} onSubmit={handleCreateRecurring}>
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setRecurringType(event.target.value as TransactionType)}
            value={recurringType}
          >
            <option value="EXPENSE">지출</option>
            <option value="INCOME">수입</option>
          </select>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            defaultValue={editingTemplate?.amount ?? ''}
            min="1"
            name="amount"
            placeholder="금액"
            required
            type="number"
          />
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            defaultValue={editingTemplate?.category?.id ?? ''}
            name="categoryId"
          >
            <option value="">카테고리 없음</option>
            {categoriesQuery.data
              ?.filter((category) => category.type === recurringType)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            defaultValue={editingTemplate?.frequency ?? 'WEEKLY'}
            name="frequency"
          >
            <option value="WEEKLY">매주</option>
            <option value="MONTHLY">매월</option>
          </select>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            defaultValue={editingTemplate?.startDate ?? formatDateInput()}
            name="startDate"
            required
            type="date"
          />
          <button
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:bg-slate-300"
            disabled={createRecurringMutation.isPending || updateRecurringMutation.isPending}
            type="submit"
          >
            <Repeat size={18} aria-hidden="true" />
            {editingTemplate ? '수정 저장' : '추가'}
          </button>
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 lg:col-span-3"
            defaultValue={editingTemplate?.memo ?? ''}
            name="memo"
            placeholder="메모"
          />
          <input
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 lg:col-span-2"
            defaultValue={editingTemplate?.endDate ?? ''}
            name="endDate"
            type="date"
          />
          <select
            className="h-11 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100 lg:col-span-2"
            defaultValue={editingTemplate?.payer.id ?? ''}
            name="payerUserId"
          >
            <option value="">나</option>
            {membersQuery.data?.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.nickname}
              </option>
            ))}
          </select>
          {editingTemplate ? (
            <button
              className="h-11 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700"
              onClick={() => setEditingTemplateId(null)}
              type="button"
            >
              수정 취소
            </button>
          ) : null}
        </form>

        <div className="mt-6 flex flex-col gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:items-center">
          <input
            className="h-10 rounded-md border border-slate-300 px-3 text-slate-950 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            onChange={(event) => setAsOfDate(event.target.value)}
            type="date"
            value={asOfDate}
          />
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-semibold text-white disabled:bg-slate-300"
            disabled={generateRecurringMutation.isPending}
            onClick={() => generateRecurringMutation.mutate(asOfDate)}
            type="button"
          >
            <Check size={18} aria-hidden="true" />
            생성 실행
          </button>
          <span className="text-sm text-slate-500">
            생성 예정 {recurringDueQuery.data?.length ?? 0}건
          </span>
        </div>

        <div className="mt-4 divide-y divide-slate-100">
          {recurringTemplatesQuery.data?.length ? (
            recurringTemplatesQuery.data.map((template) => (
              <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between" key={template.id}>
                <span>
                  <span className="block font-medium text-slate-950">
                    {template.memo || template.category?.name || '반복 거래'} · {formatWon(template.amount)}
                  </span>
                  <span className="text-sm text-slate-500">
                    {template.frequency === 'MONTHLY' ? '매월' : '매주'} · 다음 {template.nextDueDate}
                    {template.paused ? ' · 일시정지' : ''}
                  </span>
                </span>
                <div className="flex gap-2">
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                    onClick={() => startRecurringEdit(template.id)}
                    type="button"
                  >
                    수정
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700"
                    onClick={() =>
                      template.paused
                        ? resumeRecurringMutation.mutate(template.id)
                        : pauseRecurringMutation.mutate(template.id)
                    }
                    type="button"
                  >
                    {template.paused ? (
                      <Play size={18} aria-hidden="true" />
                    ) : (
                      <Pause size={18} aria-hidden="true" />
                    )}
                    {template.paused ? '재개' : '정지'}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="py-4 text-sm text-slate-500">반복 거래가 없습니다.</p>
          )}
        </div>
      </section>
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
