import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { clearAccessToken, getAccessToken, setAccessToken } from './shared/api/client'

const user = { id: 1, email: 'dev@woorilog.local', nickname: '개발자', lastUsedLedgerId: 1 }
const ledger = { id: 1, name: '기본 개인 장부', type: 'PERSONAL', ownerId: 1 }

function response(body: unknown, status = 200) {
  return Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  }))
}

function requestUrl(input: RequestInfo | URL) {
  if (input instanceof Request) return input.url
  return String(input)
}

function installApiMock(overrides?: (path: string, method: string) => Promise<Response> | undefined) {
  return vi.spyOn(window, 'fetch').mockImplementation((input, init) => {
    const url = new URL(requestUrl(input), 'http://localhost')
    const method = init?.method ?? 'GET'
    const overridden = overrides?.(`${url.pathname}${url.search}`, method)
    if (overridden) return overridden
    if (url.pathname === '/api/auth/refresh') return response({ code: 'UNAUTHORIZED', message: '세션 없음' }, 401)
    if (url.pathname === '/api/auth/dev-login') return response({ accessToken: 'access-token', expiresInSeconds: 1800, user, currentLedger: ledger })
    if (url.pathname === '/api/me') return response({ user, currentLedger: ledger })
    if (url.pathname === '/api/ledgers') return response({ currentLedgerId: 1, ledgers: [ledger] })
    if (url.pathname === '/api/ledgers/1/members') return response([{ userId: 1, nickname: '개발자', role: 'OWNER' }])
    if (url.pathname === '/api/ledgers/1/categories') return response([
      { id: 1, name: '식비', type: 'EXPENSE', categoryGroupId: 1, categoryGroupName: '식비', defaultCategory: true, sortOrder: 1 },
      { id: 2, name: '카페', type: 'EXPENSE', categoryGroupId: 1, categoryGroupName: '식비', defaultCategory: true, sortOrder: 2 },
    ])
    if (url.pathname === '/api/ledgers/1/category-groups') return response([
      { id: 1, ledgerId: 1, name: '식비', type: 'EXPENSE' },
      { id: 2, ledgerId: 1, name: '수입', type: 'INCOME' },
    ])
    if (url.pathname === '/api/notifications') return response({ unreadCount: 0, notifications: [] })
    if (url.pathname.endsWith('/settlements')) return response({ ledgerId: 1, budgetMonth: '2026-07', totalExpenseAmount: 0, members: [], transfers: [], payments: [] })
    if (url.pathname === '/api/dashboard/current') return response({
      currentLedger: ledger,
      budgetMonth: url.searchParams.get('budgetMonth') ?? '2026-07',
      totalBudgetAmount: 500000,
      totalExpenseAmount: 120000,
      remainingBudgetAmount: 380000,
      recentTransactions: [],
      categorySpending: [{ categoryGroupId: 1, name: '식비', totalSpent: 120000 }],
      memberSpending: [{ userId: 1, nickname: '개발자', totalSpent: 120000 }],
    })
    if (url.pathname === '/api/ledgers/1/statistics/monthly') return response([
      { month: '2026-06', totalBudgetAmount: 400000, totalExpenseAmount: 100000, totalIncomeAmount: 0, categorySpending: [{ categoryGroupId: 1, name: '식비', totalSpent: 100000 }] },
      { month: '2026-07', totalBudgetAmount: 500000, totalExpenseAmount: 120000, totalIncomeAmount: 300000, categorySpending: [{ categoryGroupId: 1, name: '식비', totalSpent: 120000 }] },
    ])
    return response({ code: 'NOT_FOUND', message: `Unhandled ${method} ${url.pathname}` }, 404)
  })
}

function renderApp(initialPath = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[initialPath]}><App /></MemoryRouter></QueryClientProvider>)
}

afterEach(() => {
  clearAccessToken()
  vi.restoreAllMocks()
})

describe('App', () => {
  it('renders the landing page at the root route', () => {
    renderApp('/')
    expect(screen.getByRole('heading', { level: 1, name: /함께 쓰는.*우리 집.*가계부/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '무료로 시작하기' })).toHaveAttribute('href', '/login')
  })

  it('renders the login page when unauthenticated', () => {
    renderApp('/login')
    expect(screen.getByRole('button', { name: '개발자 로그인' })).toBeInTheDocument()
  })

  it('redirects a protected route to login when no refresh session exists', async () => {
    installApiMock()
    renderApp('/dashboard')
    expect(await screen.findByRole('button', { name: '개발자 로그인' })).toBeInTheDocument()
  })

  it('clears an invalid access token and renders login', async () => {
    setAccessToken('expired-access-token')
    installApiMock((path) => path === '/api/me' ? response({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }, 401) : undefined)
    renderApp('/dashboard')
    expect(await screen.findByRole('button', { name: '개발자 로그인' })).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('logs in and renders the dashboard with real server states', async () => {
    installApiMock()
    const actor = userEvent.setup()
    renderApp('/login')
    await actor.click(screen.getByRole('button', { name: '개발자 로그인' }))
    expect(await screen.findByText('이번 달 남은 예산')).toBeInTheDocument()
    expect(await screen.findByText('정산 완료')).toBeInTheDocument()
  })

  it('changes the dashboard month when the previous month button is clicked', async () => {
    setAccessToken('access-token')
    installApiMock()
    const actor = userEvent.setup()
    renderApp('/dashboard')
    const previous = await screen.findByRole('button', { name: '이전 달 보기' })
    await actor.click(previous)
    expect(await screen.findByText(/2026년 06월도/)).toBeInTheDocument()
  })

  it('exposes new ledger creation from the global ledger switcher', async () => {
    setAccessToken('access-token')
    installApiMock()
    renderApp('/dashboard')
    expect(await screen.findByText('+ 새 장부 만들기')).toBeInTheDocument()
  })

  it('prefills a quick coffee transaction', async () => {
    setAccessToken('access-token')
    installApiMock()
    const actor = userEvent.setup()
    renderApp('/dashboard')
    await actor.click(await screen.findByRole('button', { name: '커피' }))
    expect(await screen.findByRole('dialog', { name: '거래 추가' })).toBeInTheDocument()
    expect(await screen.findByRole('combobox', { name: '카테고리' })).toHaveValue('2')
    expect(screen.getByRole('textbox', { name: '메모' })).toHaveValue('커피')
  })

  it('opens category management from transaction entry', async () => {
    setAccessToken('access-token')
    installApiMock()
    const actor = userEvent.setup()
    renderApp('/dashboard')
    await actor.click(await screen.findByRole('button', { name: '커피' }))
    await actor.click(await screen.findByRole('button', { name: '거래 입력에서 카테고리 관리 열기' }))
    expect(await screen.findByRole('heading', { level: 1, name: '카테고리 관리' })).toBeInTheDocument()
  })

  it('renders statistics aggregated for the selected period', async () => {
    setAccessToken('access-token')
    installApiMock()
    renderApp('/stats')
    expect(await screen.findByRole('heading', { level: 2, name: '월별 지출 추이' })).toBeInTheDocument()
    expect(screen.getAllByText('식비').length).toBeGreaterThan(0)
  })
})
