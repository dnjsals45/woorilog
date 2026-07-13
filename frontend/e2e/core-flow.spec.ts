import { expect, test, type Page } from '@playwright/test'

const user = { id: 1, email: 'e2e@woorilog.local', nickname: 'E2E 사용자', lastUsedLedgerId: 1 }
const ledger = { id: 1, name: 'E2E 개인 장부', type: 'PERSONAL', ownerId: 1 }

async function mockApi(page: Page) {
  await page.route('http://localhost:8080/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname
    const json = (body: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/refresh') return json({ code: 'UNAUTHORIZED', message: '세션 없음' }, 401)
    if (path === '/api/auth/dev-login') return json({ accessToken: 'e2e-token', expiresInSeconds: 1800, user, currentLedger: ledger })
    if (path === '/api/me') return json({ user, currentLedger: ledger })
    if (path === '/api/ledgers') return json({ currentLedgerId: 1, ledgers: [ledger] })
    if (path === '/api/ledgers/1/members') return json([{ userId: 1, nickname: user.nickname, role: 'OWNER' }])
    if (path === '/api/ledgers/1/categories') return json([{ id: 1, name: '카페', type: 'EXPENSE', defaultCategory: true, sortOrder: 1 }])
    if (path === '/api/notifications') return json({ unreadCount: 1, notifications: [] })
    if (path.endsWith('/settlements')) return json({ ledgerId: 1, budgetMonth: '2026-07', totalExpenseAmount: 0, members: [], transfers: [], payments: [] })
    if (path === '/api/dashboard/current') return json({ currentLedger: ledger, budgetMonth: url.searchParams.get('budgetMonth') ?? '2026-07', totalBudgetAmount: 500000, totalExpenseAmount: 120000, remainingBudgetAmount: 380000, recentTransactions: [], categorySpending: [], memberSpending: [] })
    return json({ code: 'NOT_FOUND', message: path }, 404)
  })
}

test('redirects an unauthenticated protected route to login', async ({ page }) => {
  await mockApi(page)
  await page.goto('/dashboard')
  await expect(page.getByRole('button', { name: '개발자 로그인' })).toBeVisible()
})

test('logs in, moves month, and opens a prefilled quick entry', async ({ page }) => {
  await mockApi(page)
  await page.goto('/login')
  await page.getByRole('button', { name: '개발자 로그인' }).click()
  await expect(page.getByText('이번 달 남은 예산')).toBeVisible()
  await page.getByRole('button', { name: '이전 달 보기' }).click()
  await expect(page.getByText(/2026년 06월도/)).toBeVisible()
  await page.getByRole('button', { name: '커피' }).click()
  await expect(page.getByRole('dialog', { name: '거래 추가' })).toBeVisible()
  await expect(page.getByRole('combobox', { name: '카테고리' })).toHaveValue('1')
  await expect(page.getByRole('textbox', { name: '메모' })).toHaveValue('커피')
})
