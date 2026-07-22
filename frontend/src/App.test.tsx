import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { clearAccessToken, getAccessToken, setAccessToken } from './shared/api/client'

const user = { id: 1, email: 'dev@woorilog.local', nickname: '개발자', lastUsedLedgerId: 1 }
const ledger = { id: 1, name: '기본 개인 장부', type: 'PERSONAL', ownerId: 1, recurringSummaryClosingDay: 31 }

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
      { id: 3, name: '급여', type: 'INCOME', categoryGroupId: 2, categoryGroupName: '수입', defaultCategory: true, sortOrder: 3 },
    ])
    if (url.pathname === '/api/ledgers/1/category-groups') return response([
      { id: 1, ledgerId: 1, name: '식비', type: 'EXPENSE' },
      { id: 2, ledgerId: 1, name: '수입', type: 'INCOME' },
    ])
    if (url.pathname === '/api/ledgers/1/recurring-transactions') return response([])
    if (url.pathname === '/api/ledgers/1/cards') return response([])
    if (/^\/api\/ledgers\/1\/months\/\d{4}-\d{2}\/transactions$/.test(url.pathname)) return response([])
    if (url.pathname === '/api/notifications') return response({ unreadCount: 0, notifications: [] })
    if (url.pathname.endsWith('/settlements')) return response({ ledgerId: 1, budgetMonth: '2026-07', totalExpenseAmount: 0, members: [], transfers: [], payments: [] })
    if (url.pathname === '/api/dashboard/current') return response({
      currentLedger: ledger,
      budgetMonth: url.searchParams.get('budgetMonth') ?? '2026-07',
      totalBudgetAmount: 500000,
      totalExpenseAmount: 120000,
      scheduledRecurringExpenseAmount: 50000,
      remainingBudgetAmount: 330000,
      recentTransactions: [],
      categorySpending: [{ categoryGroupId: 1, name: '식비', totalSpent: 120000 }],
      memberSpending: [{ userId: 1, nickname: '개발자', totalSpent: 120000 }],
      cardPaymentSummaries: [],
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
  window.sessionStorage.clear()
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

  it('selects a fixed development account before developer login', async () => {
    installApiMock()
    const actor = userEvent.setup()
    renderApp('/login')

    const developerTwo = screen.getByRole('button', { name: '개발자2' })
    await actor.click(developerTwo)
    expect(developerTwo).toHaveAttribute('aria-pressed', 'true')
    await actor.click(screen.getByRole('button', { name: '개발자 로그인' }))

    await waitFor(() => expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/dev-login'),
      expect.objectContaining({ body: JSON.stringify({ email: 'dev2@woorilog.com', nickname: '개발자2' }) }),
    ))
  })

  it('redirects a protected route to login when no refresh session exists', async () => {
    installApiMock()
    renderApp('/dashboard')
    expect(await screen.findByRole('button', { name: '개발자 로그인' })).toBeInTheDocument()
  })

  it('returns to an invitation link after developer login', async () => {
    installApiMock((path, method) => {
      if (path === '/api/invitations/links/invite-token' && method === 'GET') {
        return response({
          ledgerId: 2,
          ledgerName: '우리 공동 장부',
          ledgerType: 'GROUP',
          inviterNickname: '초대한 사람',
          status: 'PENDING',
          expired: false,
        })
      }
      return undefined
    })
    const actor = userEvent.setup()
    renderApp('/invitations/links/invite-token?source=share#accept')

    await actor.click(await screen.findByRole('button', { name: '개발자 로그인' }))

    expect(await screen.findByRole('heading', { level: 1, name: '초대 링크' })).toBeInTheDocument()
    expect(await screen.findByRole('heading', { level: 2, name: '우리 공동 장부' })).toBeInTheDocument()
  })

  it('does not automatically repeat a failed Kakao callback and allows an explicit retry', async () => {
    const fetchSpy = installApiMock((path, method) => {
      if (path === '/api/auth/kakao/callback' && method === 'POST') {
        return response({ code: 'KAKAO_LOGIN_FAILED', message: '로그인 실패' }, 502)
      }
      return undefined
    })
    const actor = userEvent.setup()
    renderApp('/auth/kakao/callback?code=failed-code')

    expect(await screen.findByText('카카오 로그인에 실패했습니다. 다시 시도해주세요.')).toBeInTheDocument()
    const callbackRequestCount = () => fetchSpy.mock.calls.filter(([input]) => requestUrl(input).includes('/api/auth/kakao/callback')).length
    expect(callbackRequestCount()).toBe(1)

    await actor.click(screen.getByRole('button', { name: '다시 시도' }))
    await waitFor(() => expect(callbackRequestCount()).toBe(2))
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
    expect(await screen.findByText('예정 정기비')).toBeInTheDocument()
    expect(screen.getByText('50,000원')).toBeInTheDocument()
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

  it('uses total budget and member allocations only for a group ledger', async () => {
    setAccessToken('access-token')
    const groupLedger = { ...ledger, name: '공동 장부', type: 'GROUP' }
    installApiMock((path, method) => {
      if (path === '/api/me') return response({ user, currentLedger: groupLedger })
      if (path === '/api/ledgers/1/months/2026-07' && method === 'GET') return response({
        ledgerId: 1,
        budgetMonth: '2026-07',
        totalBudgetAmount: 500000,
        fixedBudgetTotalAmount: 0,
        closed: false,
        categoryBudgets: [],
        memberAllocations: [{ userId: 1, nickname: '개발자', amount: 500000 }],
      })
      return undefined
    })
    const actor = userEvent.setup()
    renderApp('/ledgers/1/months/2026-07')

    expect(await screen.findByRole('heading', { level: 2, name: '멤버별 예산 할당' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: '대분류별 사용 현황' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 2, name: '고정비 관리' })).not.toBeInTheDocument()

    await actor.click(screen.getByText('예산 관리'))
    expect(screen.getByText('공동장부는 카테고리별 한도 대신 월 총 예산과 멤버별 할당으로 관리합니다. 정기 지출 예정액은 남은 예산에 자동 반영됩니다.')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3, name: '카테고리 예산' })).not.toBeInTheDocument()
  })

  it('exposes new ledger creation from the global ledger switcher', async () => {
    setAccessToken('access-token')
    installApiMock()
    renderApp('/dashboard')
    expect(await screen.findByText('+ 새 장부 만들기')).toBeInTheDocument()
  })

  it('logs out from the global sidebar', async () => {
    setAccessToken('access-token')
    let logoutRequested = false
    installApiMock((path, method) => {
      if (path === '/api/auth/logout' && method === 'POST') {
        logoutRequested = true
        return response(undefined, 204)
      }
      return undefined
    })
    const actor = userEvent.setup()
    renderApp('/dashboard')

    await actor.click(await screen.findByRole('button', { name: '로그아웃' }))

    await waitFor(() => expect(logoutRequested).toBe(true))
    expect(await screen.findByRole('button', { name: '개발자 로그인' })).toBeInTheDocument()
    expect(getAccessToken()).toBeNull()
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

  it('prefills the selected calendar date when adding a ledger transaction', async () => {
    setAccessToken('access-token')
    installApiMock()
    const actor = userEvent.setup()
    renderApp('/calendar')
    await actor.click(await screen.findByRole('gridcell', { name: '2026-07-13' }))
    await actor.click(screen.getAllByRole('button', { name: '거래 추가' })[0])
    expect(await screen.findByRole('dialog', { name: '거래 추가' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '날짜' })).toHaveTextContent('2026. 07. 13.')
    await actor.click(screen.getByRole('button', { name: '날짜' }))
    const datePickerDialog = await screen.findByRole('dialog', { name: '날짜 달력' })
    expect(datePickerDialog).toBeInTheDocument()
    expect(datePickerDialog.parentElement).toBe(document.body)
    expect(screen.getByRole('button', { name: '오늘' })).toBeInTheDocument()
  })

  it('deletes only the current user\'s transaction from the ledger list', async () => {
    setAccessToken('access-token')
    let deleted = false
    let deleteRequested = false
    installApiMock((path, method) => {
      if (path === '/api/ledgers/1/months/2026-07/transactions' && method === 'GET') {
        return response(deleted ? [
          { id: 2, ledgerId: 1, type: 'EXPENSE', amount: 20000, transactionDate: '2026-07-14', category: { id: 1, name: '식비', type: 'EXPENSE' }, payer: { id: 2, nickname: '함께 쓰는 사람' }, memo: '다른 사람 거래', paymentMethod: 'CASH', card: null, installment: null },
        ] : [
          { id: 1, ledgerId: 1, type: 'EXPENSE', amount: 12000, transactionDate: '2026-07-14', category: { id: 1, name: '식비', type: 'EXPENSE' }, payer: { id: 1, nickname: '개발자' }, memo: '내 거래', paymentMethod: 'CASH', card: null, installment: null },
          { id: 2, ledgerId: 1, type: 'EXPENSE', amount: 20000, transactionDate: '2026-07-14', category: { id: 1, name: '식비', type: 'EXPENSE' }, payer: { id: 2, nickname: '함께 쓰는 사람' }, memo: '다른 사람 거래', paymentMethod: 'CASH', card: null, installment: null },
        ])
      }
      if (path === '/api/transactions/1' && method === 'DELETE') {
        deleteRequested = true
        deleted = true
        return response(undefined, 204)
      }
      return undefined
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const actor = userEvent.setup()
    renderApp('/calendar')

    await actor.click(await screen.findByRole('button', { name: '선택 해제하고 월 전체 보기' }))
    await actor.click(await screen.findByRole('button', { name: '내 거래 거래 삭제' }))

    expect(confirm).toHaveBeenCalledWith('이 거래를 삭제할까요?\n삭제한 거래는 복구할 수 없습니다.')
    await waitFor(() => expect(deleteRequested).toBe(true))
    expect(await screen.findByText('다른 사람 거래')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('내 거래')).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: '다른 사람 거래 거래 삭제' })).not.toBeInTheDocument()
  })

  it('bulk deletes the current user\'s visible transactions with one request', async () => {
    setAccessToken('access-token')
    let bulkDeleted = false
    installApiMock((path, method) => {
      if (path === '/api/ledgers/1/months/2026-07/transactions' && method === 'GET') {
        return response(bulkDeleted ? [
          { id: 3, ledgerId: 1, type: 'EXPENSE', amount: 20000, transactionDate: '2026-07-21', category: { id: 1, name: '식비', type: 'EXPENSE' }, payer: { id: 2, nickname: '함께 쓰는 사람' }, memo: '다른 사람 거래', paymentMethod: 'CASH', card: null, installment: null },
        ] : [
          { id: 1, ledgerId: 1, type: 'EXPENSE', amount: 12000, transactionDate: '2026-07-21', category: { id: 1, name: '식비', type: 'EXPENSE' }, payer: { id: 1, nickname: '개발자' }, memo: '첫 내 거래', paymentMethod: 'CASH', card: null, installment: null },
          { id: 2, ledgerId: 1, type: 'INCOME', amount: 30000, transactionDate: '2026-07-21', category: { id: 3, name: '급여', type: 'INCOME' }, payer: { id: 1, nickname: '개발자' }, memo: '둘째 내 거래', paymentMethod: 'CASH', card: null, installment: null },
          { id: 3, ledgerId: 1, type: 'EXPENSE', amount: 20000, transactionDate: '2026-07-21', category: { id: 1, name: '식비', type: 'EXPENSE' }, payer: { id: 2, nickname: '함께 쓰는 사람' }, memo: '다른 사람 거래', paymentMethod: 'CASH', card: null, installment: null },
        ])
      }
      if (path === '/api/transactions/bulk-delete' && method === 'POST') {
        bulkDeleted = true
        return response(undefined, 204)
      }
      return undefined
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const actor = userEvent.setup()
    renderApp('/calendar')

    await actor.click(await screen.findByRole('gridcell', { name: '2026-07-21' }))
    await actor.click(await screen.findByRole('button', { name: '선택' }))
    expect(screen.queryByLabelText('다른 사람 거래 거래 선택')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '다른 사람 거래 선택 불가' })).toBeInTheDocument()
    await actor.click(screen.getByRole('button', { name: '이날 전체 선택' }))
    expect(screen.getByLabelText('첫 내 거래 거래 선택')).toBeChecked()
    expect(screen.getByLabelText('둘째 내 거래 거래 선택')).toBeChecked()

    await actor.click(screen.getByRole('button', { name: '2건 삭제' }))

    expect(confirm).toHaveBeenCalledWith('2건의 거래를 삭제할까요?\n삭제한 거래는 복구할 수 없습니다.')
    await waitFor(() => expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/transactions/bulk-delete'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ transactionIds: [1, 2] }) }),
    ))
    const bulkRequests = vi.mocked(window.fetch).mock.calls.filter(([input, init]) =>
      requestUrl(input).endsWith('/api/transactions/bulk-delete') && init?.method === 'POST',
    )
    expect(bulkRequests).toHaveLength(1)
    expect(await screen.findByText('다른 사람 거래')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByLabelText('첫 내 거래 거래 선택')).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: '선택' })).toBeInTheDocument()
  })

  it('separates income categories in category management', async () => {
    setAccessToken('access-token')
    installApiMock()
    const actor = userEvent.setup()
    renderApp('/categories')
    await actor.click(await screen.findByRole('button', { name: '수입 1' }))
    expect(await screen.findByText('급여')).toBeInTheDocument()
    expect(screen.queryByText('카페')).not.toBeInTheDocument()
  })

  it('shows recurring transactions outside settings with the ledger summary period', async () => {
    setAccessToken('access-token')
    installApiMock()
    renderApp('/recurring')
    expect(await screen.findByRole('heading', { level: 1, name: '정기 거래' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '반복 거래 집계 마감일' })).toHaveValue('31')
    expect(screen.getByRole('group', { name: '종료일 빠른 선택' })).toBeInTheDocument()
    expect(screen.getByText('비워두면 종료일 없이 계속 반복됩니다.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '생성 실행' })).not.toBeInTheDocument()
  })

  it('shows a paused recurring transaction and resumes it', async () => {
    setAccessToken('access-token')
    let paused = true
    installApiMock((path, method) => {
      const template = {
        id: 9,
        ledgerId: 1,
        type: 'EXPENSE',
        amount: 12000,
        category: { id: 2, name: '카페', type: 'EXPENSE' },
        payer: { id: 1, nickname: '개발자' },
        memo: '음악 구독',
        frequency: 'MONTHLY',
        startDate: '2026-07-01',
        nextDueDate: '2026-08-01',
        endDate: null,
        paused,
      }
      if (path === '/api/ledgers/1/recurring-transactions' && method === 'GET') return response([template])
      if (path === '/api/recurring-transactions/9/resume' && method === 'POST') {
        paused = false
        return response({ ...template, paused: false })
      }
      return undefined
    })
    const actor = userEvent.setup()
    renderApp('/recurring')

    expect(await screen.findByText('음악 구독')).toBeInTheDocument()
    expect(screen.getByText('중지됨')).toBeInTheDocument()
    await actor.click(screen.getByRole('button', { name: '재개' }))
    expect(await screen.findByRole('button', { name: '중지' })).toBeInTheDocument()
  })

  it('clears an incompatible import category when the candidate type changes', async () => {
    setAccessToken('access-token')
    installApiMock((path, method) => {
      if (path === '/api/ledgers/1/transaction-imports/preview' && method === 'POST') {
        return response({
          candidates: [{
            id: 'candidate-1',
            type: 'EXPENSE',
            amount: 12000,
            transactionDate: '2026-07-09',
            categoryId: 1,
            categoryName: '식비',
            memo: '점심',
            rawText: '2026-07-09 식비 점심 12,000원',
            confidence: 1,
          }],
          rejectedLines: 0,
        })
      }
      return undefined
    })
    const actor = userEvent.setup()
    renderApp('/imports')

    await actor.type(await screen.findByRole('textbox', { name: '거래 내역 텍스트' }), '2026-07-09 식비 점심 12,000원')
    await actor.click(screen.getByRole('button', { name: '텍스트 후보 만들기' }))
    const typeSelect = await screen.findByLabelText('유형')
    const categorySelect = screen.getByLabelText('카테고리')
    expect(categorySelect).toHaveValue('1')

    await actor.selectOptions(typeSelect, 'INCOME')

    expect(categorySelect).toHaveValue('')
    expect(within(categorySelect).queryByRole('option', { name: '식비' })).not.toBeInTheDocument()
    expect(within(categorySelect).getByRole('option', { name: '급여' })).toBeInTheDocument()
  })

  it('renders card management as an independent page', async () => {
    setAccessToken('access-token')
    installApiMock()
    renderApp('/cards')
    expect(await screen.findByRole('heading', { level: 1, name: '카드 관리' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '새 카드 등록' })).toBeInTheDocument()
  })

  it('updates an existing card from card management', async () => {
    setAccessToken('access-token')
    let cards = [{ id: 1, ledgerId: 1, name: '생활비 카드', statementClosingDay: 25 }]
    let updateRequested = false
    installApiMock((path, method) => {
      if (path === '/api/ledgers/1/cards' && method === 'GET') return response(cards)
      if (path === '/api/cards/1' && method === 'PUT') {
        updateRequested = true
        cards = [{ id: 1, ledgerId: 1, name: '바꾼 카드', statementClosingDay: 15 }]
        return response(cards[0])
      }
      return undefined
    })
    const actor = userEvent.setup()
    renderApp('/cards')

    await actor.click(await screen.findByRole('button', { name: '생활비 카드 수정' }))
    expect(screen.getByRole('heading', { level: 2, name: '카드 수정' })).toBeInTheDocument()
    expect(screen.getByLabelText('카드 이름')).toHaveValue('생활비 카드')
    expect(screen.getByLabelText('결제금액 확정일')).toHaveValue('25')

    await actor.clear(screen.getByLabelText('카드 이름'))
    await actor.type(screen.getByLabelText('카드 이름'), '바꾼 카드')
    await actor.selectOptions(screen.getByLabelText('결제금액 확정일'), '15')
    await actor.click(screen.getByRole('button', { name: '카드 저장' }))

    await waitFor(() => expect(updateRequested).toBe(true))
    expect(window.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/cards/1'),
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ name: '바꾼 카드', statementClosingDay: 15 }) }),
    )
    expect(await screen.findByText('바꾼 카드')).toBeInTheDocument()
    expect(screen.getByText('매달 15일 결제금액 확정')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '새 카드 등록' })).toBeInTheDocument()
  })

  it('deletes a recurring rule while keeping the action explicitly confirmed', async () => {
    setAccessToken('access-token')
    let deleteRequested = false
    installApiMock((path, method) => {
      if (path === '/api/ledgers/1/recurring-transactions' && method === 'GET') {
        return response([{
          id: 1, ledgerId: 1, type: 'EXPENSE', amount: 13900, category: null,
          payer: { id: 1, nickname: '개발자' }, memo: '음악 구독', frequency: 'MONTHLY',
          startDate: '2026-07-10', nextDueDate: '2026-08-10', endDate: null, paused: false,
        }])
      }
      if (path === '/api/recurring-transactions/1' && method === 'DELETE') {
        deleteRequested = true
        return response(undefined, 204)
      }
      return undefined
    })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const actor = userEvent.setup()
    renderApp('/recurring')
    await actor.click(await screen.findByRole('button', { name: '음악 구독 삭제' }))
    expect(confirm).toHaveBeenCalledWith('음악 구독 정기 거래를 삭제할까요?\n이미 가계부에 등록된 과거 거래는 유지됩니다.')
    expect(deleteRequested).toBe(true)
  })

  it('renders statistics aggregated for the selected period', async () => {
    setAccessToken('access-token')
    installApiMock()
    renderApp('/stats')
    expect(await screen.findByRole('heading', { level: 2, name: '월별 지출 추이' })).toBeInTheDocument()
    expect(screen.getAllByText('식비').length).toBeGreaterThan(0)
  })
})
