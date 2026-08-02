import { useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLogoutMutation, useMeQuery } from '../../features/auth/model/authQueries'
import { useLedgerMembersQuery, useLedgersQuery, useSwitchLedgerMutation } from '../../features/ledger/model/ledgerQueries'
import { TransactionAddDrawer } from '../../features/transaction/ui/TransactionAddDrawer'
import { TransactionEntryContext } from '../../shared/ui/TransactionEntryContext'
import { ApiClientError } from '../../shared/api/client'
import { AppSidebar, type LedgerRef, type NavItem } from '../../shared/ui/AppSidebar'
import { ErrorState } from '../../shared/ui/ErrorState'
import { Icon } from '../../shared/ui/Icon'

/* 디자인 시스템이 확정한 사이드바 내비게이션 5종.
 * href 로 진짜 링크를 그리고(스크린리더·새 탭 열기 유지), 클릭은 onNavigate 가 가로채
 * react-router 클라이언트 라우팅으로 넘깁니다. */
const NAVIGATION: (NavItem & { to: string })[] = [
  { id: 'dashboard', label: '홈', icon: 'house', to: '/dashboard', href: '/dashboard' },
  { id: 'transactions', label: '가계부', icon: 'receipt', to: '/transactions', href: '/transactions' },
  { id: 'recurring', label: '반복 거래', icon: 'rotate-ccw', to: '/recurring', href: '/recurring' },
  { id: 'budget', label: '예산 설정', icon: 'wallet', to: '/budget', href: '/budget' },
  { id: 'analysis', label: '분석', icon: 'chart-pie', to: '/analysis', href: '/analysis' },
]

function initialsOf(name: string | undefined): string {
  return (name ?? '').slice(0, 2)
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const meQuery = useMeQuery()
  const ledgersQuery = useLedgersQuery()
  const switchLedgerMutation = useSwitchLedgerMutation()
  const logoutMutation = useLogoutMutation()
  const [transactionEntryOpen, setTransactionEntryOpen] = useState(false)
  const [transactionEntryKey, setTransactionEntryKey] = useState(0)
  const currentLedger =
    ledgersQuery.data?.ledgers?.find((ledger) => ledger.id === ledgersQuery.data?.currentLedgerId) ??
    meQuery.data?.currentLedger
  const membersQuery = useLedgerMembersQuery(currentLedger?.id)

  if (meQuery.isLoading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] wl-body">
        사용자 정보를 확인하는 중입니다.
      </main>
    )
  }
  if (meQuery.isError && meQuery.error instanceof ApiClientError && meQuery.error.status === 401) {
    return <Navigate replace to="/login" />
  }
  if (meQuery.isError) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] px-5">
        <ErrorState onRetry={() => meQuery.refetch()} />
      </main>
    )
  }

  const isShared = (type: string | undefined) => type === 'GROUP' || type === 'SHARED'
  // 나간 사람까지 세면 혼자 쓰는 장부가 '공동 · 2명'으로 보입니다.
  const memberCount = membersQuery.data?.filter((member) => member.status === 'ACTIVE').length ?? 0
  const memberNames = membersQuery.data?.map((member) => member.nickname).join(' · ')

  const ledgerChip: LedgerRef | undefined = currentLedger
    ? {
        name: currentLedger.name,
        initials: initialsOf(currentLedger.name),
        members: isShared(currentLedger.type) ? `공동 · ${memberCount}명` : '개인 장부',
      }
    : undefined

  const ledgerOptions: LedgerRef[] | undefined = ledgersQuery.data?.ledgers?.map((ledger) => ({
    name: ledger.name,
    meta: isShared(ledger.type) ? (memberNames ? `공동 · ${memberNames}` : '공동') : '개인',
    current: ledger.id === currentLedger?.id,
  }))

  const activeId = NAVIGATION.find((item) => location.pathname.startsWith(item.to))?.id

  return (
    <TransactionEntryContext.Provider
      value={{
        openTransactionEntry: (preset) => {
          // TransactionAddDrawer 는 아직 preset(미리 채운 값)을 받지 않는다. 계약만 유지한다.
          void preset
          setTransactionEntryKey((value) => value + 1)
          setTransactionEntryOpen(true)
        },
      }}
    >
      <div
        className="wl-app-shell"
        style={{ display: 'flex', minHeight: '100dvh', background: 'var(--wl-color-background)' }}
      >
        <AppSidebar
          ledger={ledgerChip}
          ledgers={ledgerOptions}
          onSelectLedger={(selected) => {
            const match = ledgersQuery.data?.ledgers?.find((ledger) => ledger.name === selected.name)
            if (match) switchLedgerMutation.mutate(match.id)
          }}
          onCreateLedger={() => navigate('/ledgers/new')}
          nav={NAVIGATION}
          activeId={activeId}
          onNavigate={(id) => {
            const item = NAVIGATION.find((entry) => entry.id === id)
            if (item) navigate(item.to)
          }}
          onSettings={() => navigate('/settings')}
          user={
            meQuery.data
              ? {
                  name: meQuery.data.user.nickname,
                  role: isShared(currentLedger?.type) ? '공동 장부' : '개인 장부',
                  initials: initialsOf(meQuery.data.user.nickname),
                }
              : undefined
          }
          userAction={
            <button
              aria-label="로그아웃"
              className="wl-icon-button wl-icon-button--subtle"
              style={{ width: 36, height: 36 }}
              disabled={logoutMutation.isPending}
              onClick={() =>
                logoutMutation.mutate(undefined, { onSettled: () => navigate('/login', { replace: true }) })
              }
              type="button"
            >
              <Icon name="x" size="md" />
            </button>
          }
        />

        {/* 본문. 디자인 기준 최소 폭 1080px (README '앱 셸' 절). 모바일 레이아웃은 별도 작업입니다. */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wl-app-content" style={{ minWidth: 1080 }}>
            <Outlet />
          </div>
        </div>

        {/* 디자인 `거래 추가.dc.html` 은 우측 560px 드로어다. 기존 TransactionEntrySheet 를 대체한다. */}
        <TransactionAddDrawer
          key={transactionEntryKey}
          onClose={() => setTransactionEntryOpen(false)}
          open={transactionEntryOpen}
        />
      </div>
    </TransactionEntryContext.Provider>
  )
}
