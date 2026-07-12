import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { clearAccessToken, getAccessToken, setAccessToken } from './shared/api/client'

function renderApp(initialPath = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

afterEach(() => {
  clearAccessToken()
  vi.restoreAllMocks()
})

describe('App', () => {
  it('renders the landing page at the root route', () => {
    renderApp('/')

    expect(
      screen.getByRole('heading', { level: 1, name: /함께 쓰는.*우리 집.*가계부/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '무료로 시작하기' })).toHaveAttribute('href', '/login')
  })

  it('renders the login page when unauthenticated', () => {
    renderApp('/login')

    expect(
      screen.getByRole('heading', { level: 1, name: /함께 쓰는 돈을/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '개발자 로그인' })).toBeInTheDocument()
  })

  it('clears an invalid access token and renders login instead of redirecting forever', async () => {
    setAccessToken('expired-access-token')
    vi.spyOn(window, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ code: 'UNAUTHORIZED', message: '인증이 필요합니다.' }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    )

    renderApp('/dashboard')

    expect(
      await screen.findByRole('heading', { level: 1, name: /함께 쓰는 돈을/i }),
    ).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
  })

  it('logs in with developer login and renders the dashboard shell', async () => {
    const user = userEvent.setup()
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          accessToken: 'access-token',
          expiresInSeconds: 1800,
          user: { id: 1, email: 'dev@woorilog.local', nickname: '개발자' },
          currentLedger: {
            id: 1,
            name: '기본 개인 장부',
            type: 'PERSONAL',
            ownerId: 1,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    renderApp('/login')

    await user.click(screen.getByRole('button', { name: '개발자 로그인' }))

    expect(await screen.findByText('이번 달 남은 예산')).toBeInTheDocument()
  })

  it('renders ledger switch controls when session and ledgers are loaded', async () => {
    setAccessToken('access-token')
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: { id: 1, email: 'dev@woorilog.local', nickname: '개발자' },
            currentLedger: {
              id: 1,
              name: '기본 개인 장부',
              type: 'PERSONAL',
              ownerId: 1,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            currentLedgerId: 1,
            ledgers: [
              {
                id: 1,
                name: '기본 개인 장부',
                type: 'PERSONAL',
                ownerId: 1,
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    renderApp('/dashboard')

    expect((await screen.findAllByText('기본 개인 장부')).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: '장부 만들기' })).toBeInTheDocument()
  })

  it('renders monthly statistics from the authenticated ledger', async () => {
    setAccessToken('access-token')
    vi.spyOn(window, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            user: { id: 1, email: 'dev@woorilog.local', nickname: '개발자' },
            currentLedger: { id: 1, name: '기본 개인 장부', type: 'PERSONAL', ownerId: 1 },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            currentLedgerId: 1,
            ledgers: [{ id: 1, name: '기본 개인 장부', type: 'PERSONAL', ownerId: 1 }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            currentLedger: { id: 1, name: '기본 개인 장부', type: 'PERSONAL', ownerId: 1 },
            budgetMonth: '2026-07',
            totalBudgetAmount: 500000,
            totalExpenseAmount: 120000,
            remainingBudgetAmount: 380000,
            recentTransactions: [],
            categorySpending: [
              { categoryId: 1, name: '식비', totalSpent: 120000 },
            ],
            memberSpending: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              month: '2026-07',
              totalBudgetAmount: 500000,
              totalExpenseAmount: 120000,
              totalIncomeAmount: 300000,
            },
          ]),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )

    renderApp('/stats')

    expect(await screen.findByRole('heading', { level: 1, name: '통계' })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { level: 2, name: '월별 지출 추이' }),
    ).toBeInTheDocument()
  })
})
