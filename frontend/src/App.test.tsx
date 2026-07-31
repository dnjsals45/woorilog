import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { clearAccessToken, setAccessToken } from './shared/api/client'

const user = { id: 1, nickname: '개발자', nicknameConfirmed: true, timezone: 'Asia/Seoul' }
const ledger = { id: 1, name: '내 장부', type: 'PERSONAL', role: 'OWNER', status: 'ACTIVE' }

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  }))
}

function requestUrl(input: RequestInfo | URL) {
  return new URL(input instanceof Request ? input.url : String(input), 'http://localhost')
}

function installApiMock(overrides?: (url: URL, method: string) => Promise<Response> | undefined) {
  return vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
    const url = requestUrl(input)
    const method = init?.method ?? 'GET'
    const overridden = overrides?.(url, method)
    if (overridden) return overridden
    if (url.pathname === '/api/auth/refresh') return response({ code: 'UNAUTHORIZED', message: '세션 없음' }, 401)
    if (url.pathname === '/api/auth/dev-login') return response({ accessToken: 'access-token', expiresInSeconds: 1800, user, currentLedger: ledger })
    if (url.pathname === '/api/me') return response({ user, currentLedger: ledger })
    if (url.pathname === '/api/ledgers') return response({ currentLedgerId: 1, ledgers: [ledger] })
    if (url.pathname === '/api/notifications') return response({ unreadCount: 0, items: [], notifications: [] })
    if (url.pathname === '/api/dashboard/current') return response({
      ledger: ledger,
      period: { id: 10, yearMonth: '2026-07', startDate: '2026-07-01', endDate: '2026-07-31' },
      totalBudget: 500000,
      sharedExpense: 120000,
      ownExpense: 30000,
      remainingBudget: 350000,
      budgetUsageRate: 30,
      categoryDistribution: [],
      memberComparison: [],
      recentTransactions: [],
      uncategorizedCount: 0,
    })
    return response({ code: 'NOT_FOUND', message: `Unhandled ${method} ${url.pathname}` }, 404)
  })
}

function renderApp(initialPath = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialPath]}><App /></MemoryRouter></QueryClientProvider>)
}

afterEach(() => {
  clearAccessToken()
  window.sessionStorage.clear()
  vi.restoreAllMocks()
})

describe('App V1 routes', () => {
  it('renders the landing and login entry points', async () => {
    const actor = userEvent.setup()
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: /함께 쓰는.*우리 집.*가계부/i })).toBeInTheDocument()
    await actor.click(screen.getByRole('link', { name: '무료로 시작하기' }))
    expect(screen.getByRole('button', { name: '개발자 로그인' })).toBeInTheDocument()
  })

  it('redirects a protected V1 route to login without a session', async () => {
    installApiMock()
    renderApp('/transactions')
    expect(await screen.findByRole('button', { name: '개발자 로그인' })).toBeInTheDocument()
  })

  it('returns to the protected route after developer login', async () => {
    installApiMock()
    const actor = userEvent.setup()
    renderApp('/dashboard')
    await actor.click(await screen.findByRole('button', { name: '개발자 로그인' }))
    expect(await screen.findByRole('link', { name: '홈' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows a public invitation preview before login', async () => {
    installApiMock((url) => url.pathname === '/api/invitations/links/invite-token' ? response({
      invitationId: 2,
      ledgerName: '우리 공동 장부',
      inviter: { id: 2, nickname: '초대한 사람' },
      status: 'PENDING',
      expiresAt: '2026-07-31T23:59:00+09:00',
      authenticationRequired: true,
    }) : undefined)
    renderApp('/invitations/invite-token')
    expect(await screen.findByRole('heading', { level: 2, name: '우리 공동 장부' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '로그인하고 확인하기' })).toHaveAttribute('href', '/login')
  })

  it('sends users with an unfinished profile to onboarding', async () => {
    setAccessToken('access-token')
    installApiMock((url) => url.pathname === '/api/me' ? response({ user: { ...user, nicknameConfirmed: false }, currentLedger: ledger }) : undefined)
    renderApp('/budget')
    expect(await screen.findByRole('heading', { level: 1, name: '우리로그에서 사용할 이름을 정해주세요' })).toBeInTheDocument()
  })

  it('uses only the documented primary navigation', async () => {
    setAccessToken('access-token')
    installApiMock()
    renderApp('/dashboard')
    expect(await screen.findByRole('navigation', { name: '주요 메뉴' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '거래' })).toHaveAttribute('href', '/transactions')
    expect(screen.getByRole('link', { name: '예산' })).toHaveAttribute('href', '/budget')
    expect(screen.getByRole('link', { name: '분석' })).toHaveAttribute('href', '/analysis')
    expect(screen.queryByRole('link', { name: '캘린더' })).not.toBeInTheDocument()
  })

  it('renders removed legacy paths as not found', async () => {
    setAccessToken('access-token')
    installApiMock()
    renderApp('/calendar')
    expect(await screen.findByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다.' })).toBeInTheDocument()
  })

  it('uses the selected development account', async () => {
    const fetchSpy = installApiMock()
    const actor = userEvent.setup()
    renderApp('/login')
    await actor.click(screen.getByRole('button', { name: '개발자2' }))
    await actor.click(screen.getByRole('button', { name: '개발자 로그인' }))
    await waitFor(() => expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/dev-login'),
      expect.objectContaining({ body: JSON.stringify({ email: 'dev2@woorilog.com', nickname: '개발자2' }) }),
    ))
  })
})
