import { useState } from 'react'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useLogoutMutation, useMeQuery } from '../../features/auth/model/authQueries'
import { useLedgerMembersQuery, useLedgersQuery, useSwitchLedgerMutation } from '../../features/ledger/model/ledgerQueries'
import { TransactionAddDrawer } from '../../features/transaction/ui/TransactionAddDrawer'
import { TransactionEntryContext, type TransactionEntryPreset } from '../../shared/ui/TransactionEntryContext'
import { ApiClientError } from '../../shared/api/client'
import { useIsMobileShell } from '../../shared/lib/useIsMobileShell'
import { AppSidebar, type LedgerRef, type NavItem } from '../../shared/ui/AppSidebar'
import { MobileTabBar, type MobileTab } from '../../shared/ui/MobileTabBar'
import { Sheet } from '../../shared/ui/Sheet'
import { ErrorState } from '../../shared/ui/ErrorState'
import { Icon } from '../../shared/ui/Icon'

/* 디자인 시스템이 확정한 사이드바 내비게이션 5종.
 * href 로 진짜 링크를 그리고(스크린리더·새 탭 열기 유지), 클릭은 onNavigate 가 가로채
 * react-router 클라이언트 라우팅으로 넘깁니다. */
const NAVIGATION: (NavItem & { to: string })[] = [
  { id: 'dashboard', label: '홈', icon: 'house', to: '/dashboard', href: '/dashboard' },
  { id: 'transactions', label: '거래 내역', icon: 'receipt', to: '/transactions', href: '/transactions' },
  { id: 'recurring', label: '자동 기록', icon: 'rotate-ccw', to: '/recurring', href: '/recurring' },
  { id: 'budget', label: '예산 설정', icon: 'wallet', to: '/budget', href: '/budget' },
  { id: 'analysis', label: '분석', icon: 'chart-pie', to: '/analysis', href: '/analysis' },
]

/* 모바일 바텀 탭바는 5칸입니다. 데스크톱 사이드바 5종을 그대로 넣으면
 * 설정·가계부 전환·도움말이 갈 곳이 없어져서, 하루에 여러 번 오가는 네 화면만 탭으로 두고
 * 나머지는 "더보기" 시트로 모읍니다. 자동 기록은 한 번 만들어두고 가끔 고치는 관리 화면이라
 * 여기로 내렸습니다 — 사라진 게 아니라 시트 맨 위에 있습니다. */
const MOBILE_TABS: MobileTab[] = [
  { id: 'dashboard', label: '홈', icon: 'house', href: '/dashboard' },
  { id: 'transactions', label: '거래 내역', icon: 'receipt', href: '/transactions' },
  { id: 'budget', label: '예산', icon: 'wallet', href: '/budget' },
  { id: 'analysis', label: '분석', icon: 'chart-pie', href: '/analysis' },
  { id: 'more', label: '더보기', icon: 'ellipsis' },
]

/* FAB 은 "거래 추가"입니다. 거래를 적을 맥락이 아닌 화면에서는 쓸모가 없고,
 * 화면 아래쪽 버튼과 겹쳐 그걸 누르지 못하게 만듭니다(가계부 만들기의 '링크 다시 만들기').
 * /recurring 은 계획을 관리하는 화면이고 자체 '반복 지출 추가' CTA 가 있어서,
 * FAB 을 함께 두면 초록 버튼 두 개가 경쟁합니다(design-system.md anti-patterns). */
const FAB_HIDDEN_PREFIXES = ['/ledgers', '/settings', '/help', '/recurring']

/* 탭 하나에 여러 경로가 걸립니다. 시트에서만 갈 수 있는 화면도 어떤 탭을 밝힐지 정해둡니다. */
const MOBILE_TAB_ROUTES: { prefix: string; tab: string }[] = [
  { prefix: '/dashboard', tab: 'dashboard' },
  { prefix: '/transactions', tab: 'transactions' },
  { prefix: '/budget', tab: 'budget' },
  { prefix: '/periods', tab: 'budget' },
  { prefix: '/analysis', tab: 'analysis' },
  { prefix: '/recurring', tab: 'more' },
  { prefix: '/settings', tab: 'more' },
  { prefix: '/help', tab: 'more' },
  { prefix: '/ledgers', tab: 'more' },
]

function initialsOf(name: string | undefined): string {
  return (name ?? '').slice(0, 2)
}

export function AppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobileShell()
  const meQuery = useMeQuery()
  const ledgersQuery = useLedgersQuery()
  const switchLedgerMutation = useSwitchLedgerMutation()
  const logoutMutation = useLogoutMutation()
  const [transactionEntryOpen, setTransactionEntryOpen] = useState(false)
  const [transactionEntryKey, setTransactionEntryKey] = useState(0)
  const [transactionEntryPreset, setTransactionEntryPreset] = useState<TransactionEntryPreset | undefined>(undefined)
  const [moreSheetOpen, setMoreSheetOpen] = useState(false)
  const [ledgerSheetOpen, setLedgerSheetOpen] = useState(false)
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
    return <Navigate replace to="/" />
  }
  if (meQuery.isError) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[var(--wl-color-background)] px-5">
        <ErrorState onRetry={() => meQuery.refetch()} />
      </main>
    )
  }

  const isShared = (type: string | undefined) => type === 'GROUP' || type === 'SHARED'
  // 나간 사람까지 세면 혼자 쓰는 가계부가 '공동 · 2명'으로 보입니다.
  const memberCount = membersQuery.data?.filter((member) => member.status === 'ACTIVE').length ?? 0
  const memberNames = membersQuery.data?.map((member) => member.nickname).join(' · ')

  const ledgerChip: LedgerRef | undefined = currentLedger
    ? {
        name: currentLedger.name,
        initials: initialsOf(currentLedger.name),
        members: isShared(currentLedger.type) ? `공동 · ${memberCount}명` : '개인 가계부',
      }
    : undefined

  const ledgerOptions: LedgerRef[] | undefined = ledgersQuery.data?.ledgers?.map((ledger) => ({
    name: ledger.name,
    meta: isShared(ledger.type) ? (memberNames ? `공동 · ${memberNames}` : '공동') : '개인',
    current: ledger.id === currentLedger?.id,
  }))

  const activeId = NAVIGATION.find((item) => location.pathname.startsWith(item.to))?.id
  const activeTabId = MOBILE_TAB_ROUTES.find((entry) => location.pathname.startsWith(entry.prefix))?.tab
  const showFab = !FAB_HIDDEN_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))

  function selectLedger(selected: LedgerRef) {
    const match = ledgersQuery.data?.ledgers?.find((ledger) => ledger.name === selected.name)
    if (match) switchLedgerMutation.mutate(match.id)
  }

  function goto(to: string) {
    setMoreSheetOpen(false)
    navigate(to)
  }

  const logout = () => logoutMutation.mutate(undefined, { onSettled: () => navigate('/', { replace: true }) })

  return (
    <TransactionEntryContext.Provider
      value={{
        openTransactionEntry: (preset) => {
          /* onClick={openTransactionEntry} 로 바로 붙은 호출은 MouseEvent 가 넘어옵니다.
           * 실제 preset 객체일 때만 미리 채운 값으로 씁니다. */
          const value = preset && !('nativeEvent' in preset) ? preset : undefined
          setTransactionEntryPreset(value)
          setTransactionEntryKey((key) => key + 1)
          setTransactionEntryOpen(true)
        },
      }}
    >
      <div
        className="wl-app-shell"
        style={{ display: 'flex', minHeight: '100dvh', background: 'var(--wl-color-background)' }}
      >
        {isMobile ? null : (
          <AppSidebar
            activeId={activeId}
            ledger={ledgerChip}
            ledgers={ledgerOptions}
            nav={NAVIGATION}
            onCreateLedger={() => navigate('/ledgers/new')}
            onHome={() => navigate('/dashboard')}
            onNavigate={(id) => {
              const item = NAVIGATION.find((entry) => entry.id === id)
              if (item) navigate(item.to)
            }}
            onSelectLedger={selectLedger}
            onSettings={() => navigate('/settings')}
            user={
              meQuery.data
                ? {
                    name: meQuery.data.user.nickname,
                    role: isShared(currentLedger?.type) ? '공동 가계부' : '개인 가계부',
                    initials: initialsOf(meQuery.data.user.nickname),
                  }
                : undefined
            }
            userAction={
              <button
                aria-label="로그아웃"
                className="wl-icon-button wl-icon-button--subtle"
                disabled={logoutMutation.isPending}
                onClick={logout}
                style={{ width: 36, height: 36 }}
                type="button"
              >
                <Icon name="x" size="md" />
              </button>
            }
          />
        )}

        {/* 본문. 데스크톱은 디자인 기준 최소 폭 1080px (README '앱 셸' 절).
            모바일 앱 뷰에서는 화면 폭을 그대로 쓰고 하단 탭바만큼 여백을 둡니다
            (styles/patterns/mobile-shell.css). */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="wl-app-content" style={isMobile ? undefined : { minWidth: 1080 }}>
            <Outlet />
          </div>
        </div>

        {isMobile ? (
          <>
            <MobileTabBar
              activeId={activeTabId}
              onSelect={(id) => {
                if (id === 'more') {
                  setMoreSheetOpen(true)
                  return
                }
                const tab = MOBILE_TABS.find((entry) => entry.id === id)
                if (tab?.href) navigate(tab.href)
              }}
              tabs={MOBILE_TABS}
            />
            {/* 거래 추가는 데스크톱에서 헤더 버튼입니다. 모바일에서는 엄지가 닿는 자리에 둡니다. */}
            {showFab ? (
              <button
                aria-label="거래 추가"
                className="wl-fab"
                onClick={() => {
                  setTransactionEntryKey((value) => value + 1)
                  setTransactionEntryOpen(true)
                }}
                type="button"
              >
                <Icon name="plus" size="xl" />
              </button>
            ) : null}
          </>
        ) : null}

        {isMobile && moreSheetOpen ? (
          <Sheet onClose={() => setMoreSheetOpen(false)} title="더보기">
            <ul className="wl-sheet-list">
              <li>
                <button className="wl-sheet-option" onClick={() => goto('/recurring')} type="button">
                  <Icon name="rotate-ccw" size="lg" />
                  <span>
                    <strong>자동 기록</strong>
                    <small>고정비와 할부를 한 곳에서 관리해요</small>
                  </span>
                </button>
              </li>
              <li>
                <button
                  className="wl-sheet-option"
                  onClick={() => {
                    setMoreSheetOpen(false)
                    setLedgerSheetOpen(true)
                  }}
                  type="button"
                >
                  <Icon name="users" size="lg" />
                  <span>
                    <strong>가계부 전환</strong>
                    <small>{ledgerChip ? `${ledgerChip.name} · ${ledgerChip.members}` : '가계부를 불러오는 중'}</small>
                  </span>
                  <Icon name="chevron-right" size="sm" />
                </button>
              </li>
              <li>
                <button className="wl-sheet-option" onClick={() => goto('/settings')} type="button">
                  <Icon name="settings" size="lg" />
                  <span>
                    <strong>설정</strong>
                    <small>프로필, 멤버, 카테고리, 알림</small>
                  </span>
                </button>
              </li>
              <li>
                <button className="wl-sheet-option" onClick={() => goto('/help')} type="button">
                  <Icon name="info" size="lg" />
                  <span>
                    <strong>도움말</strong>
                  </span>
                </button>
              </li>
            </ul>
            <div className="wl-sheet-divider" />
            <div style={{ alignItems: 'center', display: 'flex', gap: 12, padding: '4px 12px 12px' }}>
              <span
                style={{
                  background: 'var(--wl-data-blue-soft)',
                  borderRadius: '50%',
                  color: 'var(--wl-data-blue-ink)',
                  display: 'grid',
                  flex: 'none',
                  fontSize: 12,
                  fontWeight: 700,
                  height: 36,
                  placeItems: 'center',
                  width: 36,
                }}
              >
                {initialsOf(meQuery.data?.user.nickname)}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: 14, fontWeight: 650 }}>{meQuery.data?.user.nickname}</strong>
                <small style={{ color: 'var(--wl-color-text-secondary)', fontSize: 11.5 }}>
                  {isShared(currentLedger?.type) ? '공동 가계부' : '개인 가계부'}
                </small>
              </span>
              <button
                className="wl-button wl-button--secondary"
                disabled={logoutMutation.isPending}
                onClick={logout}
                style={{ flex: 'none', minHeight: 40, padding: '0 14px' }}
                type="button"
              >
                로그아웃
              </button>
            </div>
          </Sheet>
        ) : null}

        {isMobile && ledgerSheetOpen ? (
          <Sheet onClose={() => setLedgerSheetOpen(false)} title="가계부 전환">
            <ul className="wl-sheet-list">
              {(ledgerOptions ?? []).map((ledger) => (
                <li key={ledger.name}>
                  <button
                    aria-current={ledger.current ? 'true' : undefined}
                    className="wl-sheet-option"
                    onClick={() => {
                      setLedgerSheetOpen(false)
                      selectLedger(ledger)
                    }}
                    type="button"
                  >
                    <span>
                      <strong>{ledger.name}</strong>
                      <small>{ledger.meta}</small>
                    </span>
                    {ledger.current ? <Icon name="check" size="sm" /> : null}
                  </button>
                </li>
              ))}
            </ul>
            <div className="wl-sheet-divider" />
            <button
              className="wl-sheet-option"
              onClick={() => {
                setLedgerSheetOpen(false)
                navigate('/ledgers/new')
              }}
              type="button"
            >
              <Icon name="plus" size="lg" />
              <span>
                <strong>새 공동 가계부 만들기</strong>
              </span>
            </button>
          </Sheet>
        ) : null}

        {/* 디자인 `거래 추가.dc.html` 은 우측 560px 드로어다. 모바일에서는 바텀시트로 올라온다. */}
        <TransactionAddDrawer
          key={transactionEntryKey}
          preset={transactionEntryPreset}
          onClose={() => setTransactionEntryOpen(false)}
          open={transactionEntryOpen}
        />
      </div>
    </TransactionEntryContext.Provider>
  )
}
