import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { clearAccessToken, setAccessToken } from './shared/api/client'

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
      screen.getByRole('heading', { level: 1, name: /수입과 지출을 함께 관리하고/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '무료로 시작하기' })).toHaveAttribute('href', '/login')
  })

  it('renders the login page when unauthenticated', () => {
    renderApp('/login')

    expect(
      screen.getByRole('heading', { level: 1, name: '우리로그' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '개발자 로그인' })).toBeInTheDocument()
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

    expect(await screen.findByText('이번 달 예산')).toBeInTheDocument()
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

    expect(await screen.findByText('기본 개인 장부')).toBeInTheDocument()
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

    expect(await screen.findByRole('heading', { level: 1, name: '월별 통계' })).toBeInTheDocument()
    expect(await screen.findByText('2026-07')).toBeInTheDocument()
    expect(screen.getByText('120,000원')).toBeInTheDocument()
  })
})
