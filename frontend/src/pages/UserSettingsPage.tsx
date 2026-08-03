import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useMeQuery, useUpdateProfileMutation } from '../features/auth/model/authQueries'
import {
  useCategoriesQuery,
  useCategoryGroupsQuery,
  useCreateCategoryMutation,
  useDeleteCategoryMutation,
  useUpdateCategoryGroupVisibilityMutation,
  useUpdateCategoryMutation,
} from '../features/category/model/categoryQueries'
import type { CategorySummary } from '../features/category/api/categoryApi'
import { useCancelInvitationMutation, useCreateInvitationLinkMutation } from '../features/invitation/model/invitationQueries'
import type { BudgetCycle, LedgerMember } from '../features/ledger/api/ledgerApi'
import {
  useDeleteLedgerMutation,
  useLeaveLedgerMutation,
  useLedgerMembersQuery,
  useLedgersQuery,
  useRemoveLedgerMemberMutation,
  useRenameLedgerMutation,
  useTransferLedgerOwnershipMutation,
  useUpdateLedgerBudgetCycleMutation,
} from '../features/ledger/model/ledgerQueries'
import { useNotificationPreferencesQuery, useUpdateNotificationPreferencesMutation } from '../features/notification/model/notificationQueries'
import type { TransactionType } from '../features/transaction/api/transactionApi'
import { ApiClientError } from '../shared/api/client'
import { copyText } from '../shared/lib/clipboard'
import { AppHeader } from '../shared/ui/AppHeader'
import { Badge } from '../shared/ui/Badge'
import { Button } from '../shared/ui/Button'
import { EmptyState } from '../shared/ui/EmptyState'
import { ErrorState } from '../shared/ui/ErrorState'
import { Icon } from '../shared/ui/Icon'
import { Input } from '../shared/ui/Input'
import { Modal } from '../shared/ui/Modal'
import { SaveBar } from '../shared/ui/SaveBar'
import { Skeleton } from '../shared/ui/Skeleton'
import { Toast } from '../shared/ui/Toast'

const TABS = [
  { id: 'profile', label: '프로필' },
  { id: 'ledger', label: '장부' },
  { id: 'members', label: '멤버' },
  { id: 'categories', label: '카테고리' },
  { id: 'notices', label: '알림' },
] as const
type TabId = (typeof TABS)[number]['id']

const START_DAYS: Array<number | 'LAST'> = [...Array.from({ length: 28 }, (_, index) => index + 1), 'LAST']

/** 온보딩(OnboardingPage.tsx)과 같은 닉네임 규칙(2~12자)입니다. */
const RESERVED_NICKNAMES = ['우리로그', '관리자']

function getNicknameError(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) return '닉네임을 입력해 주세요.'
  if (trimmed.length < 2) return '두 글자 이상 입력해 주세요.'
  if (trimmed.length > 12) return '열두 글자까지 쓸 수 있어요.'
  if (RESERVED_NICKNAMES.includes(trimmed)) return '이 이름은 쓸 수 없어요. 다른 이름을 정해 주세요.'
  return ''
}

type ConfirmState = { kind: 'leave' } | { kind: 'delete' } | { kind: 'remove'; memberId: number; memberName: string }

function kindLabel(type: TransactionType): string {
  if (type === 'EXPENSE') return '지출'
  if (type === 'INCOME') return '수입'
  return '계좌이체'
}

function formatJoinedDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getMonth() + 1}월 ${date.getDate()}일`
}

function isSharedLedgerType(type: string | undefined): boolean {
  return type === 'GROUP' || type === 'SHARED'
}

/** RecurringTransactionPage.tsx의 SwitchTrack과 같은 모양·같은 방식입니다.
 * shared/ui/에는 아직 Switch 컴포넌트가 없어 export 되지 않은 그 패턴을 그대로 옮겼습니다(잠금 상태만 추가). */
function SwitchTrack({ on, locked = false }: { on: boolean; locked?: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'flex',
        alignItems: 'center',
        flex: 'none',
        width: 44,
        height: 26,
        padding: 3,
        borderRadius: 'var(--wl-radius-pill)',
        justifyContent: on ? 'flex-end' : 'flex-start',
        background: on ? (locked ? 'var(--wl-data-neutral)' : 'var(--wl-color-primary)') : 'var(--wl-data-neutral-muted)',
        transition: 'background-color 160ms var(--ease-out-strong)',
      }}
    >
      <i style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgb(0 0 0 / 20%)' }} />
    </span>
  )
}

export function UserSettingsPage() {
  const me = useMeQuery()
  const ledgers = useLedgersQuery()
  const currentLedgerId = ledgers.data?.currentLedgerId ?? me.data?.currentLedger.id
  const currentLedger = ledgers.data?.ledgers.find((ledger) => ledger.id === currentLedgerId) ?? me.data?.currentLedger
  const members = useLedgerMembersQuery(currentLedgerId)
  const viewer = members.data?.find((member) => member.userId === me.data?.user.id)
  const partner = members.data?.find((member) => member.userId !== me.data?.user.id && member.status === 'ACTIVE')
  /* 과거에 함께 쓴 사람. 장부를 지우면 이 사람들의 읽기 전용 접근도 함께 사라지므로 확인 모달에서 알립니다. */
  const formerMembers = (members.data ?? []).filter((member) => member.userId !== me.data?.user.id && member.status === 'FORMER')
  const isOwner = viewer?.role === 'OWNER'
  const isShared = isSharedLedgerType(currentLedger?.type)
  const savedName = currentLedger?.name ?? ''

  const renameLedger = useRenameLedgerMutation(currentLedgerId)
  const updateBudgetCycle = useUpdateLedgerBudgetCycleMutation(currentLedgerId)
  const removeMember = useRemoveLedgerMemberMutation(currentLedgerId)
  const leaveLedger = useLeaveLedgerMutation(currentLedgerId)
  const deleteLedger = useDeleteLedgerMutation(currentLedgerId)
  const transferOwnership = useTransferLedgerOwnershipMutation(currentLedgerId)
  const createInvitation = useCreateInvitationLinkMutation(currentLedgerId)
  const cancelInvitationLink = useCancelInvitationMutation(currentLedgerId)

  const categoriesQuery = useCategoriesQuery(currentLedgerId)
  const groupsQuery = useCategoryGroupsQuery(currentLedgerId)
  const createCategory = useCreateCategoryMutation(currentLedgerId)
  const updateCategory = useUpdateCategoryMutation(currentLedgerId)
  const deleteCategory = useDeleteCategoryMutation(currentLedgerId)
  const updateGroupVisibility = useUpdateCategoryGroupVisibilityMutation(currentLedgerId)

  const preferences = useNotificationPreferencesQuery()
  const updatePreferences = useUpdateNotificationPreferencesMutation()
  const updateProfile = useUpdateProfileMutation()

  const [tab, setTab] = useState<TabId>('ledger')
  const [nameDraft, setNameDraft] = useState<string | null>(null)
  const [budgetCycleDraft, setBudgetCycleDraft] = useState<BudgetCycle | null>(null)
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null)
  const [nicknameTouched, setNicknameTouched] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState | null>(null)
  const [confirmText, setConfirmText] = useState('')
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [dupWarning, setDupWarning] = useState(false)
  const [applyPastByCategoryId, setApplyPastByCategoryId] = useState<Record<number, boolean>>({})
  const [toast, setToast] = useState('')
  const [invitation, setInvitation] = useState<{ invitationId: number; url: string; expiresAt: string } | null>(null)
  const [inviteLeftMs, setInviteLeftMs] = useState(0)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  useEffect(() => {
    if (!invitation) return
    const update = () => {
      const left = new Date(invitation.expiresAt).getTime() - Date.now()
      setInviteLeftMs(Math.max(0, left))
      if (left <= 0) setInvitation(null)
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [invitation])

  if (me.isError && me.error instanceof ApiClientError && me.error.status === 401) return <Navigate replace to="/login" />

  function showToast(text: string) {
    clearTimeout(toastTimer.current)
    setToast(text)
    toastTimer.current = setTimeout(() => setToast(''), 3500)
  }

  const nameValue = nameDraft ?? savedName
  const nameDirty = nameDraft !== null && nameDraft.trim().length > 0 && nameDraft.trim().length <= 30 && nameDraft.trim() !== savedName

  const savedCycle = currentLedger?.budgetCycle ?? null
  const selectedCycle = budgetCycleDraft ?? savedCycle
  const budgetCycleDirty =
    budgetCycleDraft !== null &&
    (budgetCycleDraft.startType !== savedCycle?.startType || budgetCycleDraft.startDay !== savedCycle?.startDay)

  function pickStartDay(day: number | 'LAST') {
    setBudgetCycleDraft(day === 'LAST' ? { startType: 'LAST_DAY_OF_MONTH', startDay: null } : { startType: 'DAY_OF_MONTH', startDay: day })
  }

  const savedNickname = me.data?.user.nickname ?? ''
  const nicknameValue = nicknameDraft ?? savedNickname
  const nicknameError = getNicknameError(nicknameValue)
  const nicknameDirty = nicknameDraft !== null && !nicknameError && nicknameDraft.trim() !== savedNickname

  const settingsDirty = nameDirty || budgetCycleDirty || nicknameDirty

  function saveSettings() {
    if (!settingsDirty) return
    const tasks: Promise<unknown>[] = []
    if (nameDirty) tasks.push(renameLedger.mutateAsync((nameDraft ?? '').trim()))
    if (budgetCycleDirty && budgetCycleDraft) tasks.push(updateBudgetCycle.mutateAsync(budgetCycleDraft))
    if (nicknameDirty && me.data) tasks.push(updateProfile.mutateAsync({ nickname: (nicknameDraft ?? '').trim(), timezone: me.data.user.timezone }))
    Promise.all(tasks)
      .then(() => {
        setNameDraft(null)
        setBudgetCycleDraft(null)
        setNicknameDraft(null)
        setNicknameTouched(false)
        showToast('설정을 저장했어요')
      })
      .catch(() => showToast('저장하지 못했어요. 다시 시도해주세요'))
  }

  function runConfirm() {
    if (!confirm || confirmText.trim() !== savedName) return
    if (confirm.kind === 'remove') {
      removeMember.mutate(confirm.memberId, {
        onSuccess: () => { setConfirm(null); setConfirmText(''); showToast(`${confirm.memberName}님을 내보냈어요. 자동 등록은 일시정지했어요`) },
      })
      return
    }
    if (confirm.kind === 'delete') {
      deleteLedger.mutate(undefined, {
        onSuccess: () => { setConfirm(null); setConfirmText(''); showToast('장부를 삭제했어요') },
        onError: () => showToast('장부를 삭제하지 못했어요. 함께 쓰는 사람이 있는지 확인해주세요'),
      })
      return
    }
    leaveLedger.mutate(undefined, {
      onSuccess: () => { setConfirm(null); setConfirmText(''); showToast('장부에서 나갔어요') },
    })
  }

  async function makeInvite() {
    const hadInvite = Boolean(invitation)
    try {
      const created = await createInvitation.mutateAsync()
      setInvitation({ invitationId: created.invitationId, url: new URL(created.url, window.location.origin).toString(), expiresAt: created.expiresAt })
      showToast(hadInvite ? '새 링크를 만들었어요. 이전 링크는 끊겼어요' : '초대 링크를 만들었어요')
    } catch {
      showToast('초대 링크를 만들지 못했어요. 다시 시도해주세요')
    }
  }

  function copyInvite() {
    if (!invitation) return
    void copyText(invitation.url)
    showToast('링크를 복사했어요')
  }

  function cancelInvite() {
    if (!invitation) return
    cancelInvitationLink.mutate(invitation.invitationId, {
      onSuccess: () => { setInvitation(null); showToast('초대 링크를 끊었어요') },
    })
  }

  const groups = groupsQuery.data ?? []
  const categories = categoriesQuery.data ?? []
  const activeGroupId = selectedGroupId ?? groups[0]?.id ?? null
  const activeGroup = groups.find((group) => group.id === activeGroupId)
  const subs = categories.filter((category) => category.categoryGroupId === activeGroupId)

  function commitRename(category: CategorySummary, rawValue: string) {
    const trimmed = rawValue.trim()
    if (!trimmed || trimmed === category.name) return
    if (subs.some((sub) => sub.id !== category.id && sub.name === trimmed)) {
      setDupWarning(true)
      return
    }
    const applyToPast = Boolean(applyPastByCategoryId[category.id])
    updateCategory.mutate(
      { categoryId: category.id, request: { name: trimmed, categoryGroupId: category.categoryGroupId, applyNameToPastTransactions: applyToPast } },
      {
        onSuccess: () => {
          setDupWarning(false)
          setApplyPastByCategoryId((prev) => { const next = { ...prev }; delete next[category.id]; return next })
          showToast(applyToPast ? `'${category.name}'을 '${trimmed}'(으)로 바꾸고 과거 거래에도 적용했어요` : `'${category.name}'을 '${trimmed}'(으)로 바꿨어요`)
        },
        onError: (error) => { if (error instanceof ApiClientError && error.code === 'CATEGORY_NAME_DUPLICATED') setDupWarning(true) },
      },
    )
  }

  function toggleGroupHidden(group: { code: string; hidden: boolean; name: string }) {
    const nextHidden = !group.hidden
    updateGroupVisibility.mutate(
      { groupCode: group.code, hidden: nextHidden },
      { onSuccess: () => showToast(nextHidden ? `${group.name}을 이 장부에서 숨겼어요` : `${group.name}을 다시 보이게 했어요`) },
    )
  }

  function addSub() {
    const trimmed = newSubName.trim()
    if (!trimmed || !activeGroup) return
    if (subs.some((sub) => sub.name === trimmed)) {
      setDupWarning(true)
      return
    }
    createCategory.mutate(
      { name: trimmed, type: activeGroup.type, categoryGroupId: activeGroup.id },
      {
        onSuccess: () => { setNewSubName(''); setDupWarning(false); showToast(`${activeGroup.name}에 ${trimmed}을 추가했어요`) },
        onError: (error) => { if (error instanceof ApiClientError && error.code === 'CATEGORY_NAME_DUPLICATED') setDupWarning(true) },
      },
    )
  }

  function deleteSub(category: CategorySummary) {
    deleteCategory.mutate(category.id, { onSuccess: () => showToast(`${category.name}을 삭제했어요. 이전 거래에는 그대로 남아요`) })
  }

  function toggleNotice(id: 'warn80' | 'weekly') {
    if (!preferences.data) return
    if (id === 'warn80') updatePreferences.mutate({ ...preferences.data, budgetWarning80Enabled: !preferences.data.budgetWarning80Enabled })
    else updatePreferences.mutate({ ...preferences.data, weeklyGuideEnabled: !preferences.data.weeklyGuideEnabled })
  }

  const inviteSeconds = Math.floor(inviteLeftMs / 1000)
  const inviteMm = String(Math.floor(inviteSeconds / 60)).padStart(2, '0')
  const inviteSs = String(inviteSeconds % 60).padStart(2, '0')

  const isLoading = me.isLoading || ledgers.isLoading
  const hasError = me.isError || ledgers.isError

  return (
    <>
      <AppHeader description={`프로필과 ${savedName || '내 장부'}의 장부, 멤버, 카테고리, 알림을 관리해요`} title="설정" />

      <div className="settings-layout">
        <nav className="settings-tabs">
          {TABS.map((item) => (
            <button
              aria-current={tab === item.id ? 'page' : undefined}
              className="settings-tab"
              key={item.id}
              onClick={() => setTab(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          {isLoading ? <Skeleton height={220} radius={18} /> : null}
          {hasError && !isLoading ? <ErrorState description="설정 정보를 다시 불러와주세요." onRetry={() => { me.refetch(); ledgers.refetch() }} /> : null}

          {!isLoading && !hasError && tab === 'profile' ? (
            <section style={{ maxWidth: 760 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-.015em' }}>프로필</h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--wl-color-text-secondary)' }}>공동 장부에서 상대방에게 보이는 이름이에요.</p>

              <div style={{ marginTop: 20, maxWidth: 420 }}>
                <Input
                  error={nicknameTouched && nicknameError ? nicknameError : undefined}
                  hint="두 글자에서 열두 글자까지 쓸 수 있어요."
                  id="settings-nickname"
                  label="닉네임"
                  maxLength={12}
                  onBlur={() => setNicknameTouched(true)}
                  onChange={(event) => setNicknameDraft(event.target.value.slice(0, 12))}
                  value={nicknameValue}
                />
              </div>
            </section>
          ) : null}

          {!isLoading && !hasError && tab === 'ledger' ? (
            <section style={{ maxWidth: 760 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-.015em' }}>장부</h2>

              <div style={{ marginTop: 20, maxWidth: 420 }}>
                <Input
                  id="settings-ledger-name"
                  label="장부 이름"
                  maxLength={30}
                  onChange={(event) => setNameDraft(event.target.value)}
                  value={nameValue}
                />
              </div>

              <div style={{ marginTop: 26 }}>
                <span className="wl-field-label" style={{ display: 'block', marginBottom: 8 }}>예산 기간 시작일</span>
                <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                  시작일부터 다음 시작일 전날까지를 한 기간으로 계산해요.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxWidth: 560 }}>
                  {START_DAYS.map((day) => {
                    const isSelected = day === 'LAST' ? selectedCycle?.startType === 'LAST_DAY_OF_MONTH' : selectedCycle?.startType === 'DAY_OF_MONTH' && selectedCycle.startDay === day
                    return (
                      <button
                        aria-pressed={isSelected}
                        key={String(day)}
                        onClick={() => pickStartDay(day)}
                        style={{
                          minWidth: 44,
                          height: 44,
                          padding: '0 10px',
                          borderRadius: 12,
                          border: `1px solid ${isSelected ? 'var(--wl-color-primary)' : 'var(--wl-color-border)'}`,
                          background: isSelected ? 'var(--wl-brand-100)' : 'var(--wl-color-surface)',
                          color: isSelected ? 'var(--wl-color-primary-dark)' : 'var(--wl-color-text-body)',
                          fontSize: 13,
                          fontWeight: isSelected ? 700 : 600,
                          fontVariantNumeric: 'tabular-nums',
                        }}
                        type="button"
                      >
                        {day === 'LAST' ? '말일' : day}
                      </button>
                    )
                  })}
                </div>
                {!selectedCycle ? (
                  <p style={{ margin: '14px 0 0', padding: '12px 14px', borderRadius: 'var(--wl-radius-md)', background: 'var(--wl-color-surface-subtle)', fontSize: 13, color: 'var(--wl-color-text-body)' }}>
                    아직 시작일을 고르지 않았어요. 날짜를 골라서 저장해주세요.
                  </p>
                ) : null}
              </div>

              {isShared ? (
                <div style={{ marginTop: 32, paddingTop: 22, borderTop: '1px solid var(--wl-color-border)' }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: 'var(--wl-color-danger)' }}>장부에서 나가기</h3>
                  <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
                    {isOwner
                      ? partner
                        ? `소유자는 바로 나갈 수 없어요. ${partner.nickname}님에게 소유권을 넘기면 탈퇴할 수 있어요.`
                        : '소유자는 바로 나갈 수 없어요. 넘길 멤버가 없으면 탈퇴할 수 없어요.'
                      : '나가면 이 장부에 거래를 기록하거나 예산을 바꿀 수 없어요. 참여했던 기간은 읽기 전용으로 볼 수 있어요.'}
                  </p>
                  {isOwner && !partner ? (
                    <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
                      함께 쓰는 사람이 없으면 장부를 삭제할 수 있어요. 나가기와 달리 장부 자체가 사라져요.
                    </p>
                  ) : null}
                  <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                    {isOwner && partner ? (
                      <button
                        disabled={transferOwnership.isPending}
                        onClick={() => transferOwnership.mutate(partner.userId, { onSuccess: () => showToast(`${partner.nickname}님에게 소유권을 넘겼어요`) })}
                        style={{ minHeight: 44, padding: '0 14px', border: '1px solid var(--wl-color-border)', borderRadius: 'var(--wl-radius-md)', background: 'var(--wl-color-surface)', fontSize: 13, fontWeight: 700, color: 'var(--wl-color-text-body)' }}
                        type="button"
                      >
                        {partner.nickname}님에게 소유권 넘기기
                      </button>
                    ) : null}
                    <button
                      disabled={isOwner}
                      onClick={() => setConfirm({ kind: 'leave' })}
                      style={{
                        minHeight: 44,
                        padding: '0 14px',
                        borderRadius: 'var(--wl-radius-md)',
                        border: '1px solid var(--wl-color-border)',
                        fontSize: 13,
                        fontWeight: 700,
                        background: 'var(--wl-color-surface)',
                        color: isOwner ? 'var(--wl-color-text-disabled)' : 'var(--wl-color-danger)',
                        opacity: isOwner ? 0.55 : 1,
                      }}
                      type="button"
                    >
                      장부 탈퇴
                    </button>
                    {isOwner && !partner ? (
                      <button
                        onClick={() => setConfirm({ kind: 'delete' })}
                        style={{
                          minHeight: 44,
                          padding: '0 14px',
                          borderRadius: 'var(--wl-radius-md)',
                          border: '1px solid var(--wl-color-danger)',
                          fontSize: 13,
                          fontWeight: 700,
                          background: 'var(--wl-color-surface)',
                          color: 'var(--wl-color-danger)',
                        }}
                        type="button"
                      >
                        장부 삭제
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {!isLoading && !hasError && tab === 'members' ? (
            <section style={{ maxWidth: 760 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-.015em' }}>멤버</h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--wl-color-text-secondary)' }}>공동 장부는 두 명까지 함께 써요.</p>

              {members.isLoading ? <Skeleton height={140} radius={12} /> : null}
              {members.isError ? <ErrorState description="멤버 정보를 다시 불러와주세요." onRetry={() => members.refetch()} /> : null}

              {!members.isLoading && !members.isError ? (
                <ul style={{ display: 'grid', gap: 10, margin: '20px 0 0', padding: 0, listStyle: 'none' }}>
                  {(members.data ?? []).map((member: LedgerMember) => {
                    const isSelf = member.userId === me.data?.user.id
                    const removable = isOwner && member.role !== 'OWNER' && member.status === 'ACTIVE' && !isSelf
                    return (
                      <li
                        key={member.userId}
                        style={{ display: 'grid', gridTemplateColumns: '40px minmax(0,1fr) auto', alignItems: 'center', gap: 14, padding: 14, border: '1px solid var(--wl-color-border)', borderRadius: 'var(--wl-radius-md)', background: 'var(--wl-color-surface)' }}
                      >
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            fontSize: 12,
                            fontWeight: 700,
                            background: member.role === 'OWNER' ? 'var(--wl-data-blue-soft)' : 'var(--wl-data-violet-soft)',
                            color: member.role === 'OWNER' ? 'var(--wl-data-blue-ink)' : 'var(--wl-data-violet-ink)',
                          }}
                        >
                          {member.nickname.slice(0, 2)}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <strong style={{ fontSize: 14.5, fontWeight: 600 }}>{member.nickname}</strong>
                            <Badge tone={member.role === 'OWNER' ? 'brand' : 'neutral'}>{member.role === 'OWNER' ? '소유자' : '멤버'}</Badge>
                          </span>
                          <span style={{ display: 'block', marginTop: 4, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
                            {isSelf ? '나예요' : member.status === 'FORMER' ? '더 이상 함께하지 않아요 · 과거 기록은 읽기 전용이에요' : `${formatJoinedDate(member.joinedAt)}에 참여했어요`}
                          </span>
                        </span>
                        {removable ? (
                          <button
                            onClick={() => setConfirm({ kind: 'remove', memberId: member.userId, memberName: member.nickname })}
                            style={{ minHeight: 44, padding: '0 12px', borderRadius: 12, fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-danger)' }}
                            type="button"
                          >
                            내보내기
                          </button>
                        ) : null}
                      </li>
                    )
                  })}
                  {!members.data?.length ? <EmptyState description="아직 함께하는 멤버가 없어요." title="멤버가 없어요" /> : null}
                </ul>
              ) : null}

              {isShared ? (
                <div style={{ marginTop: 24, padding: 20, border: '1px solid var(--wl-color-border)', borderRadius: 'var(--wl-radius-lg)', background: 'var(--wl-color-surface)' }}>
                  <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700 }}>초대 링크</h3>
                  {isOwner ? (
                    <>
                      <p style={{ margin: '7px 0 0', fontSize: 12.5, lineHeight: 1.6, color: 'var(--wl-color-text-secondary)' }}>
                        링크는 만든 뒤 30분 동안만 쓸 수 있고, 장부마다 한 개만 살아 있어요. 새로 만들면 이전 링크는 바로 끊겨요.
                      </p>
                      {invitation ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, animation: 'wl-fade-up 200ms var(--ease-out-strong) both' }}>
                          <span
                            style={{
                              flex: 1,
                              minWidth: 0,
                              height: 46,
                              display: 'flex',
                              alignItems: 'center',
                              padding: '0 14px',
                              border: '1px solid var(--wl-color-border)',
                              borderRadius: 'var(--wl-radius-md)',
                              background: 'var(--wl-color-surface-subtle)',
                              fontSize: 13,
                              color: 'var(--wl-color-text-body)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {invitation.url}
                          </span>
                          <span
                            className="wl-tabular"
                            style={{ flex: 'none', padding: '0 10px', height: 46, display: 'flex', alignItems: 'center', fontSize: 13, fontWeight: 700, color: inviteLeftMs < 300_000 ? 'var(--wl-color-danger)' : 'var(--wl-color-text-secondary)' }}
                          >
                            {inviteMm}:{inviteSs}
                          </span>
                          <Button onClick={copyInvite} size="md" variant="secondary">복사</Button>
                        </div>
                      ) : null}
                      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                        <Button loading={createInvitation.isPending} onClick={makeInvite}>{invitation ? '새 링크 만들기' : '초대 링크 만들기'}</Button>
                        {invitation ? (
                          <button
                            disabled={cancelInvitationLink.isPending}
                            onClick={cancelInvite}
                            style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}
                            type="button"
                          >
                            링크 끊기
                          </button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>초대 링크는 장부 소유자만 만들 수 있어요.</p>
                  )}
                </div>
              ) : null}
            </section>
          ) : null}

          {!isLoading && !hasError && tab === 'categories' ? (
            <section>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-.015em' }}>카테고리</h2>
                  <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--wl-color-text-secondary)' }}>대분류를 선택해서 원하는 소분류를 추가할 수 있어요.</p>
                </div>
              </div>

              {categoriesQuery.isError || groupsQuery.isError ? (
                <div style={{ marginTop: 20 }}>
                  <ErrorState onRetry={() => { categoriesQuery.refetch(); groupsQuery.refetch() }} />
                </div>
              ) : null}

              {categoriesQuery.isLoading || groupsQuery.isLoading ? <div style={{ marginTop: 20 }}><Skeleton height={320} radius={18} /></div> : null}

              {categoriesQuery.isSuccess && groupsQuery.isSuccess ? (
                <div className="settings-category-grid">
                  <ul style={{ display: 'grid', gap: 2, margin: 0, padding: 0, listStyle: 'none', maxHeight: 520, overflowY: 'auto' }}>
                    {groups.map((group) => {
                      const count = categories.filter((category) => category.categoryGroupId === group.id).length
                      return (
                        <li key={group.id}>
                          <button
                            onClick={() => { setSelectedGroupId(group.id); setNewSubName(''); setDupWarning(false) }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              width: '100%',
                              minHeight: 56,
                              padding: '0 12px',
                              borderRadius: 'var(--wl-radius-md)',
                              background: group.id === activeGroupId ? 'var(--wl-brand-50)' : 'transparent',
                              transition: 'background-color 160ms var(--ease-out-strong)',
                            }}
                            type="button"
                          >
                            <span style={{ minWidth: 0, textAlign: 'left' }}>
                              <strong style={{ display: 'block', fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</strong>
                              <span style={{ display: 'block', marginTop: 3, fontSize: 11.5, color: 'var(--wl-color-text-secondary)' }}>{kindLabel(group.type)} · 소분류 {count}개</span>
                            </span>
                          </button>
                        </li>
                      )
                    })}
                    {!groups.length ? <EmptyState description="장부에 카테고리 대분류가 아직 없어요." title="대분류가 없어요" /> : null}
                  </ul>

                  {activeGroup ? (
                    <div style={{ padding: '20px 22px 22px', border: '1px solid var(--wl-color-border)', borderRadius: 'var(--wl-radius-lg)', background: 'var(--wl-color-surface)', boxShadow: 'var(--wl-shadow-card)' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                        <div style={{ minWidth: 0 }}>
                          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{activeGroup.name}</h3>
                          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>{kindLabel(activeGroup.type)} 대분류예요. 대분류 이름과 개수는 바꿀 수 없어요.</p>
                        </div>
                        <button
                          aria-pressed={activeGroup.hidden}
                          disabled={updateGroupVisibility.isPending}
                          onClick={() => toggleGroupHidden(activeGroup)}
                          style={{ display: 'flex', alignItems: 'center', gap: 9, minHeight: 44, padding: '0 4px', fontSize: 12.5, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}
                          type="button"
                        >
                          <SwitchTrack on={activeGroup.hidden} />
                          이 장부에서 숨기기
                        </button>
                      </div>

                      <ul style={{ display: 'grid', gap: 2, margin: '16px 0 0', padding: 0, listStyle: 'none' }}>
                        {subs.map((category) => (
                          <li
                            className="settings-sub-row"
                            key={category.id}
                          >
                            <input
                              aria-label="소분류 이름"
                              className="wl-input"
                              defaultValue={category.name}
                              key={category.id}
                              onBlur={(event) => commitRename(category, event.target.value)}
                              style={{ minWidth: 0, height: 40, padding: '0 8px', marginLeft: -8, border: '1px solid transparent', borderRadius: 9, background: 'transparent', fontSize: 14, fontWeight: 600 }}
                              type="text"
                            />
                            {/* TODO(api): 소분류별 거래 건수는 GET /api/ledgers/{ledgerId}/categories 응답에 필드가 없어 표시할 수 없습니다. */}
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600, color: 'var(--wl-color-text-secondary)', whiteSpace: 'nowrap' }}>
                              <input
                                checked={Boolean(applyPastByCategoryId[category.id])}
                                onChange={(event) => setApplyPastByCategoryId((prev) => ({ ...prev, [category.id]: event.target.checked }))}
                                type="checkbox"
                              />
                              과거 거래에도 적용
                            </label>
                            <button
                              aria-label={`${category.name} 삭제`}
                              disabled={deleteCategory.isPending}
                              onClick={() => deleteSub(category)}
                              style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, borderRadius: 12, color: 'var(--wl-color-text-secondary)' }}
                              type="button"
                            >
                              <Icon name="trash-2" size="md" />
                            </button>
                          </li>
                        ))}
                        {!subs.length ? <p style={{ margin: '8px 0 0', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>아직 소분류가 없어요.</p> : null}
                      </ul>

                      <div style={{ display: 'flex', gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--wl-color-border)' }}>
                        <input
                          aria-label="새 소분류 이름"
                          className="wl-input"
                          onChange={(event) => { setNewSubName(event.target.value); setDupWarning(false) }}
                          placeholder="소분류 추가"
                          style={{ flex: 1, minWidth: 0, height: 44, padding: '0 12px', fontSize: 14 }}
                          type="text"
                          value={newSubName}
                        />
                        <Button disabled={!newSubName.trim() || createCategory.isPending} onClick={addSub} variant="secondary">추가</Button>
                      </div>
                      {dupWarning ? (
                        <p role="alert" style={{ margin: '9px 0 0', fontSize: 12.5, color: 'var(--wl-color-danger)', animation: 'wl-fade-up 180ms var(--ease-out-strong) both' }}>
                          같은 대분류 안에는 이름이 같은 소분류를 둘 수 없어요.
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          ) : null}

          {!isLoading && !hasError && tab === 'notices' ? (
            <section style={{ maxWidth: 720 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, letterSpacing: '-.015em' }}>알림</h2>
              <p style={{ margin: '8px 0 0', fontSize: 13, color: 'var(--wl-color-text-secondary)' }}>설정은 나에게만 적용되고 상대방 알림에는 영향을 주지 않아요.</p>

              {preferences.isError ? <div style={{ marginTop: 20 }}><ErrorState onRetry={() => preferences.refetch()} /></div> : null}
              {preferences.isLoading ? <div style={{ marginTop: 20 }}><Skeleton height={200} radius={12} /></div> : null}

              {preferences.isSuccess ? (
                <ul style={{ display: 'grid', gap: 10, margin: '20px 0 0', padding: 0, listStyle: 'none' }}>
                  {[
                    { id: 'warn80' as const, label: '예산 사용률 80% 주의', note: '공동 예산과 내 예산이 80%에 닿으면 알려드려요.', locked: false, on: preferences.data.budgetWarning80Enabled },
                    { id: 'over100' as const, label: '예산 소진과 초과', note: '다 쓰거나 초과하면 반드시 알려요. 이 알림은 끌 수 없어요.', locked: true, on: true },
                    { id: 'weekly' as const, label: '일요일 주간 예산 가이드', note: '매주 일요일 저녁에 다음 주 권장액을 정리해 드려요.', locked: false, on: preferences.data.weeklyGuideEnabled },
                    { id: 'change' as const, label: '공동 예산 변경', note: '상대방이 예산을 바꾸면 반드시 알려요. 이 알림은 끌 수 없어요.', locked: true, on: true },
                  ].map((notice) => (
                    <li key={notice.id}>
                      <button
                        disabled={notice.locked || updatePreferences.isPending}
                        onClick={() => { if (notice.id === 'warn80' || notice.id === 'weekly') toggleNotice(notice.id) }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 16,
                          width: '100%',
                          padding: 16,
                          border: '1px solid var(--wl-color-border)',
                          borderRadius: 'var(--wl-radius-md)',
                          background: 'var(--wl-color-surface)',
                          opacity: notice.locked ? 0.85 : 1,
                        }}
                        type="button"
                      >
                        <span style={{ minWidth: 0, textAlign: 'left' }}>
                          <strong style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>{notice.label}</strong>
                          <span style={{ display: 'block', marginTop: 4, fontSize: 12.5, lineHeight: 1.55, color: 'var(--wl-color-text-secondary)' }}>{notice.note}</span>
                        </span>
                        <SwitchTrack locked={notice.locked} on={notice.on} />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      <SaveBar
        note={
          nicknameDirty
            ? `'${(nicknameDraft ?? '').trim()}'(으)로 닉네임이 바뀌어요`
            : nameDirty && budgetCycleDirty
              ? '장부 이름과 예산 기간 시작일이 바뀌어요'
              : nameDirty
                ? `'${(nameDraft ?? '').trim()}'(으)로 장부 이름이 바뀌어요`
                : budgetCycleDirty
                  ? '예산 기간 시작일이 바뀌어요'
                  : undefined
        }
        offset={232}
        open={settingsDirty}
        title="저장하지 않은 변경이 있어요"
      >
        <button
          onClick={() => { setNameDraft(null); setBudgetCycleDraft(null); setNicknameDraft(null); setNicknameTouched(false) }}
          style={{ minHeight: 44, padding: '0 14px', borderRadius: 12, fontSize: 13, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}
          type="button"
        >
          되돌리기
        </button>
        <Button loading={renameLedger.isPending || updateBudgetCycle.isPending || updateProfile.isPending} onClick={saveSettings}>변경 저장</Button>
      </SaveBar>

      {toast ? (
        <div style={{ position: 'fixed', right: 28, bottom: settingsDirty ? 96 : 28, zIndex: 60 }}>
          <Toast tone="success">{toast}</Toast>
        </div>
      ) : null}

      {confirm ? (
        <Modal onClose={() => { setConfirm(null); setConfirmText('') }} open width={520}>
          <span style={{ display: 'grid', placeItems: 'center', width: 42, height: 42, borderRadius: 13, background: 'var(--wl-danger-soft)', color: 'var(--wl-color-danger)' }}>
            <Icon name="triangle-alert" size="lg" />
          </span>
          <h2 style={{ margin: '16px 0 0', fontSize: 19, fontWeight: 800, letterSpacing: '-.025em', lineHeight: 1.35, wordBreak: 'keep-all' }}>
            {confirm.kind === 'remove'
              ? `${confirm.memberName}님을 이 장부에서 내보낼까요?`
              : confirm.kind === 'delete'
                ? `'${savedName}'을 삭제할까요?`
                : `'${savedName}'에서 나갈까요?`}
          </h2>
          <p style={{ margin: '9px 0 0', fontSize: 13.5, lineHeight: 1.65, color: 'var(--wl-color-text-body)', wordBreak: 'keep-all' }}>
            {confirm.kind === 'remove'
              ? `'${savedName}'에서 ${confirm.memberName}님을 내보내면 다시 초대하기 전에는 함께 기록할 수 없어요.`
              : confirm.kind === 'delete'
                ? '삭제하면 이 장부의 거래, 예산, 반복 거래가 모두 사라져요. 되돌릴 수 없어요.'
                : '나가면 이 장부에 거래를 기록하거나 예산을 바꿀 수 없어요. 참여했던 기간은 읽기 전용으로 볼 수 있어요.'}
          </p>
          <ul style={{ display: 'grid', gap: 9, margin: '18px 0 0', padding: 16, borderRadius: 'var(--wl-radius-md)', background: 'var(--wl-color-surface-subtle)', listStyle: 'none' }}>
            {(confirm.kind === 'delete'
              ? [
                  ...(formerMembers.length > 0
                    ? [`${formerMembers.map((member) => member.nickname).join(', ')}님이 참여했던 기간을 더 이상 볼 수 없게 돼요.`]
                    : []),
                  '아직 살아 있는 초대 링크가 있으면 끊겨요. 링크를 받은 사람에게는 삭제된 장부라고 안내해요.',
                  '삭제한 뒤에는 다른 장부로 이동해요. 개인 장부는 그대로 남아요.',
                ]
              : confirm.kind === 'remove'
              ? [
                  `내보낸 뒤에도 ${confirm.memberName}님은 함께했던 기간을 읽기 전용으로 볼 수 있어요.`,
                  '고정비, 할부와 반복 거래의 자동 등록이 모두 일시정지되고 알림으로 알려드려요.',
                  `${confirm.memberName}님에게도 알림이 가요. 기록된 거래와 예산은 지워지지 않아요.`,
                ]
              : [
                  '나간 뒤에도 내가 참여했던 기간은 읽기 전용으로 볼 수 있어요.',
                  '공개하지 않았던 내 개인 거래는 이후에도 상대방에게 보이지 않아요.',
                  '고정비, 할부와 반복 거래의 자동 등록은 일시정지되고 남은 사람이 다시 켜야 해요.',
                ]
            ).map((text) => (
              <li key={text} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.6, color: 'var(--wl-color-text-body)' }}>
                <Icon name="info" size="sm" />
                <span style={{ minWidth: 0, wordBreak: 'keep-all' }}>{text}</span>
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 20 }}>
            <Input label={`맞다면 '${savedName}'을 적어 주세요`} onChange={(event) => setConfirmText(event.target.value)} value={confirmText} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button
              onClick={() => { setConfirm(null); setConfirmText('') }}
              style={{ minHeight: 48, padding: '0 16px', borderRadius: 12, fontSize: 13.5, fontWeight: 700, color: 'var(--wl-color-text-secondary)' }}
              type="button"
            >
              취소
            </button>
            <Button
              disabled={confirmText.trim() !== savedName}
              loading={removeMember.isPending || leaveLedger.isPending || deleteLedger.isPending}
              onClick={runConfirm}
              size="lg"
              variant="danger"
            >
              {confirm.kind === 'remove' ? '내보내기' : confirm.kind === 'delete' ? '장부 삭제' : '장부에서 나가기'}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
