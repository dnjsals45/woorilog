import { Link, Navigate, useParams } from 'react-router-dom'
import { useState } from 'react'
import woorilogLogo from '../assets/logo/woorilog-logo.svg'
import { ApiClientError } from '../shared/api/client'
import { storeAuthReturnPath } from '../features/auth/model/authReturnPath'
import { useMeQuery } from '../features/auth/model/authQueries'
import {
  useAcceptLinkInvitationMutation,
  useLinkInvitationPreviewQuery,
  useRejectLinkInvitationMutation,
} from '../features/invitation/model/invitationQueries'
import { Icon } from '../shared/ui/Icon'
import { Skeleton } from '../shared/ui/Skeleton'

type ErrorVariant = 'expired' | 'full' | 'member' | 'differentPartner' | 'deletedLedger'

const ERROR_CONTENT: Record<ErrorVariant, { title: string; body: string; cta: string; href: string }> = {
  expired: {
    title: '이 초대 링크는 더 이상 쓸 수 없어요',
    body: '만든 뒤 30분이 지났거나 새 링크로 교체됐어요. 초대한 사람에게 링크를 다시 받아 주세요.',
    cta: '내 가계부로 가기',
    href: '/dashboard',
  },
  full: {
    title: '이 가계부는 이미 두 명이 쓰고 있어요',
    body: '공동 가계부는 두 명까지 함께 쓸 수 있어요. 새로 함께 쓰려면 다른 공동 가계부를 만들어 주세요.',
    cta: '공동 가계부 만들기',
    href: '/ledgers/new',
  },
  member: {
    title: '이미 이 가계부의 멤버예요',
    body: '초대를 다시 수락하지 않아도 돼요. 바로 가계부로 이동해 계속 기록할 수 있어요.',
    cta: '가계부로 이동',
    href: '/dashboard',
  },
  /* 한 번이라도 두 사람이 쓴 가계부는 원래 상대방만 다시 들어올 수 있습니다.
   * 남은 거래 기록이 처음부터 함께하지 않은 사람에게 넘어가지 않게 하기 위한 제한입니다.
   * 링크는 멀쩡하므로 "만료" 문구로 뭉뚱그리면 사용자가 링크를 다시 받으러 갑니다. */
  /* 링크는 멀쩡한데 가계부가 지워진 경우입니다. '만료'로 뭉뚱그리면 초대받은 사람이
   * 링크를 다시 받으러 가는데, 다시 받을 가계부가 없습니다. */
  deletedLedger: {
    title: '이 가계부는 삭제됐어요',
    body: '초대한 사람이 가계부를 삭제했어요. 링크를 다시 받아도 참여할 수 없어요. 함께 쓰려면 새 공동 가계부를 만들어 달라고 해주세요.',
    cta: '내 가계부로 가기',
    href: '/dashboard',
  },
  differentPartner: {
    title: '이 가계부는 다른 분과 함께 쓰던 곳이에요',
    body: '이미 기록된 거래가 남아 있어서 처음 함께 쓰던 분만 다시 들어올 수 있어요. 새로 시작하려면 공동 가계부를 새로 만들어 주세요.',
    cta: '공동 가계부 만들기',
    href: '/ledgers/new',
  },
}

const VALID_NOTES = [
  '공동 예산 거래는 두 사람이 함께 기록하고 수정할 수 있어요.',
  '내 예산 거래는 기본적으로 상대방에게 보이지 않아요.',
  '참여 전에 저장된 공동 예산과 거래도 볼 수 있어요.',
]

function remainingMinutesLabel(expiresAt: string) {
  const remainingMs = new Date(expiresAt).getTime() - Date.now()
  const minutes = Math.max(0, Math.ceil(remainingMs / 60000))
  return `남은 시간 ${minutes}분`
}

/** 공동 가계부는 두 명까지 참여할 수 있다(백엔드 LEDGER_MEMBER_LIMIT_REACHED 기준). */
const MAX_LEDGER_MEMBERS = 2

function budgetCycleLabel(budgetCycle: { startType: string; startDay: number | null }) {
  return budgetCycle.startType === 'LAST_DAY_OF_MONTH'
    ? '매월 말일부터 시작하는 예산 기간'
    : `매월 ${budgetCycle.startDay}일부터 시작하는 예산 기간`
}

export function InvitationLinkPage() {
  const params = useParams()
  const token = params.token
  const [accepted, setAccepted] = useState(false)
  const meQuery = useMeQuery()
  const previewQuery = useLinkInvitationPreviewQuery(token)
  const acceptMutation = useAcceptLinkInvitationMutation(token)
  const rejectMutation = useRejectLinkInvitationMutation(token)

  if (meQuery.data && !meQuery.data.user.nicknameConfirmed) {
    storeAuthReturnPath(`/invitations/${token}`)
    return <Navigate replace to="/onboarding" />
  }

  const isUnauthenticated = Boolean(
    previewQuery.data?.authenticationRequired
      || (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401),
  )

  function handleAccept() {
    acceptMutation.mutate(undefined, {
      onSuccess: () => setAccepted(true),
    })
  }

  // accept(POST) 실패의 경합 상황 안전망. 정원 초과·이미 멤버는 이제 조회 단계(currentMemberCount·
  // viewerAlreadyMember)에서 먼저 걸러지지만, 조회와 수락 사이에 다른 사람이 먼저 참여하는 경합이
  // 있을 수 있어 accept 실패 코드도 그대로 매핑해 둔다.
  let acceptErrorVariant: ErrorVariant | null = null
  if (acceptMutation.isError && acceptMutation.error instanceof ApiClientError) {
    if (acceptMutation.error.code === 'LEDGER_MEMBER_LIMIT_REACHED') acceptErrorVariant = 'full'
    else if (acceptMutation.error.code === 'ALREADY_LEDGER_MEMBER') acceptErrorVariant = 'member'
    else if (acceptMutation.error.code === 'LEDGER_DELETED') acceptErrorVariant = 'deletedLedger'
    else if (acceptMutation.error.code === 'DIFFERENT_PARTNER_NOT_ALLOWED') acceptErrorVariant = 'differentPartner'
    else acceptErrorVariant = 'expired'
  }

  /* 조회(GET) 실패는 404(없음/타입 오류)·409 INVITATION_ALREADY_PROCESSED(이미 처리됨)·
   * 410 INVITATION_EXPIRED(진짜 만료)·410 LEDGER_DELETED(가계부 삭제됨)로 나뉜다.
   * 앞의 셋은 "링크를 다시 받으면 된다"는 점이 같아 한 화면으로 묶고,
   * 가계부 삭제는 다시 받아도 소용없으므로 따로 보여준다. */
  const previewErrorVariant: ErrorVariant | null = !previewQuery.isError
    ? null
    : previewQuery.error instanceof ApiClientError && previewQuery.error.code === 'LEDGER_DELETED'
      ? 'deletedLedger'
      : 'expired'

  // 정원 초과·이미 멤버는 참여 버튼을 누르기 전, 조회 응답만으로 바로 판별한다.
  // viewerAlreadyMember는 비로그인 조회면 null이므로 명시적으로 true일 때만 "이미 멤버"로 취급한다.
  let previewStateVariant: ErrorVariant | null = null
  if (previewQuery.data) {
    if (previewQuery.data.viewerAlreadyMember === true) previewStateVariant = 'member'
    else if (previewQuery.data.currentMemberCount >= MAX_LEDGER_MEMBERS) previewStateVariant = 'full'
    else if (previewQuery.data.viewerIsDifferentPartner === true) previewStateVariant = 'differentPartner'
  }

  const errorVariant = acceptErrorVariant ?? previewErrorVariant ?? previewStateVariant

  return (
    <main className="auth-surface flex min-h-dvh flex-col items-center px-4 py-12 sm:px-8">
      <img alt="우리로그" src={woorilogLogo} style={{ display: 'block', width: 'auto', height: 40 }} />

      {accepted && previewQuery.data ? (
        <InvitationAcceptedCard ledgerName={previewQuery.data.ledgerName} />
      ) : errorVariant ? (
        <InvitationErrorCard variant={errorVariant} />
      ) : previewQuery.isLoading || !previewQuery.data ? (
        <InvitationLoadingCard />
      ) : (
        <InvitationValidCard
          isUnauthenticated={isUnauthenticated}
          onAccept={handleAccept}
          onDecline={() => rejectMutation.mutate()}
          acceptPending={acceptMutation.isPending}
          rejectPending={rejectMutation.isPending}
          preview={previewQuery.data}
          returnPath={`/invitations/${token}`}
        />
      )}

      <p className="wl-meta" style={{ margin: '20px 0 0' }}>링크는 만든 뒤 30분 동안만 쓸 수 있어요.</p>
    </main>
  )
}

function InvitationLoadingCard() {
  return (
    <div className="auth-card public-card">
      <Skeleton height={24} radius={999} width={88} />
      <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
        <Skeleton height={28} />
        <Skeleton height={28} width="70%" />
      </div>
      <div style={{ marginTop: 22 }}>
        <Skeleton height={72} radius={12} />
      </div>
      <div style={{ marginTop: 22 }}>
        <Skeleton height={48} />
      </div>
    </div>
  )
}

function InvitationValidCard({
  preview,
  isUnauthenticated,
  onAccept,
  onDecline,
  acceptPending,
  rejectPending,
  returnPath,
}: {
  preview: {
    ledgerName: string
    inviter: { nickname: string }
    expiresAt: string
    budgetCycle: { startType: string; startDay: number | null }
    currentMemberCount: number
  }
  isUnauthenticated: boolean
  onAccept: () => void
  onDecline: () => void
  acceptPending: boolean
  rejectPending: boolean
  returnPath: string
}) {
  return (
    <div className="auth-card public-card" data-anim>
      <span
        className="wl-label"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          borderRadius: 'var(--wl-radius-pill)',
          background: 'var(--wl-brand-100)',
          fontWeight: 700,
          color: 'var(--wl-color-primary-dark)',
        }}
      >
        초대장
      </span>
      <h1
        className="wl-page-title"
        style={{ margin: '16px 0 0', fontSize: 23, lineHeight: 1.35, wordBreak: 'keep-all' }}
      >
        {preview.inviter.nickname}님이 함께 쓸 가계부에 초대했어요
      </h1>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          marginTop: 22,
          padding: 16,
          border: '1px solid var(--wl-color-border)',
          borderRadius: 'var(--wl-radius-md)',
          background: 'var(--wl-color-surface-subtle)',
        }}
      >
        <span
          style={{
            display: 'grid',
            placeItems: 'center',
            width: 40,
            height: 40,
            flex: 'none',
            borderRadius: 12,
            background: 'var(--wl-brand-100)',
            color: 'var(--wl-color-primary-dark)',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          우리
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <h2 className="wl-list-title" style={{ display: 'block', margin: 0 }}>{preview.ledgerName}</h2>
          <p className="wl-meta" style={{ margin: '4px 0 0' }}>
            {budgetCycleLabel(preview.budgetCycle)} · 참여 인원 {preview.currentMemberCount}명
          </p>
        </span>
      </div>

      <ul style={{ display: 'grid', gap: 10, margin: '22px 0 0', padding: 0, listStyle: 'none' }}>
        {VALID_NOTES.map((note) => (
          <li key={note} className="wl-body" style={{ display: 'flex', gap: 9, lineHeight: 1.6 }}>
            <Icon name="check" size="sm" />
            <span style={{ minWidth: 0, wordBreak: 'keep-all' }}>{note}</span>
          </li>
        ))}
      </ul>

      <div
        className="invitation-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 28,
          paddingTop: 20,
          borderTop: '1px solid var(--wl-color-border)',
        }}
      >
        {isUnauthenticated ? (
          <Link
            className="wl-button wl-button--primary wl-button--lg wl-button--full"
            onClick={() => storeAuthReturnPath(returnPath)}
            to="/"
          >
            로그인하고 확인하기
          </Link>
        ) : (
          <>
            <button
              className="wl-button wl-button--primary wl-button--lg"
              disabled={acceptPending}
              onClick={onAccept}
              type="button"
            >
              참여하기
            </button>
            <button
              className="wl-button wl-button--text wl-button--lg"
              disabled={rejectPending}
              onClick={onDecline}
              type="button"
            >
              초대 거절
            </button>
            <span className="wl-meta wl-tabular" style={{ marginLeft: 'auto' }}>
              {remainingMinutesLabel(preview.expiresAt)}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

function InvitationAcceptedCard({ ledgerName }: { ledgerName: string }) {
  return (
    <div className="auth-card public-card" data-anim>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'var(--wl-brand-100)',
          color: 'var(--wl-color-primary-dark)',
        }}
      >
        <Icon name="check" size="xl" />
      </span>
      <h1 className="wl-page-title" style={{ margin: '18px 0 0', fontSize: 22 }}>{ledgerName}에 참여했어요</h1>
      <p className="wl-body" style={{ margin: '8px 0 0', lineHeight: 1.6, color: 'var(--wl-color-text-secondary)', wordBreak: 'keep-all' }}>
        참여 이전에 저장된 공동 예산과 거래도 모두 볼 수 있어요. 다음으로 두 사람의 예산을 함께 나눠요.
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 26,
          paddingTop: 20,
          borderTop: '1px solid var(--wl-color-border)',
        }}
      >
        <Link className="wl-button wl-button--primary wl-button--lg" to="/budget">예산 나누기</Link>
        <Link className="wl-button wl-button--text wl-button--lg" to="/dashboard">먼저 둘러보기</Link>
      </div>
    </div>
  )
}

function InvitationErrorCard({ variant }: { variant: ErrorVariant }) {
  const content = ERROR_CONTENT[variant]
  return (
    <div className="auth-card public-card" data-anim>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 44,
          height: 44,
          borderRadius: 14,
          background: 'var(--wl-data-neutral-soft)',
          color: 'var(--wl-color-text-secondary)',
        }}
      >
        <Icon name="info" size="xl" />
      </span>
      <h1
        className="wl-page-title"
        style={{ margin: '18px 0 0', fontSize: 22, lineHeight: 1.35, wordBreak: 'keep-all' }}
      >
        {content.title}
      </h1>
      <p className="wl-body" style={{ margin: '8px 0 0', lineHeight: 1.6, color: 'var(--wl-color-text-secondary)', wordBreak: 'keep-all' }}>
        {content.body}
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 26,
          paddingTop: 20,
          borderTop: '1px solid var(--wl-color-border)',
        }}
      >
        <Link className="wl-button wl-button--primary wl-button--lg" to={content.href}>{content.cta}</Link>
      </div>
    </div>
  )
}
