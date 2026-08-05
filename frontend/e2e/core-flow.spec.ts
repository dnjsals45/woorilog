import { expect, test, type Page } from '@playwright/test'

/* 목은 실제 응답과 같은 모양이어야 합니다. 어긋나면 apiRequest 가 '[api-contract]' 로
 * 콘솔에 남기므로(shared/api/contract.ts) 브라우저 콘솔에서 바로 드러납니다. */
const user = { id: 1, email: 'e2e@woorilog.local', nickname: 'E2E 사용자', nicknameConfirmed: true, timezone: 'Asia/Seoul' }
const ledger = { id: 1, name: 'E2E 개인 가계부', type: 'PERSONAL', ownerId: 1, recurringSummaryClosingDay: 25, budgetCycle: { startType: 'DAY_OF_MONTH', startDay: 1 } }
const dashboardLedger = { id: 1, name: 'E2E 개인 가계부', type: 'PERSONAL', role: 'OWNER', accessState: 'ACTIVE', partner: null }

/* 기본 대분류 두 개와 그 안의 항목들. 카테고리 선택이 타일 → 항목 펼침 구조라
 * 그룹 정보(categoryGroupId·groupCode)가 응답에 있어야 화면이 그려집니다. */
const categories = [
  { id: 1, ledgerId: 1, name: '장보기', type: 'EXPENSE', categoryGroupId: 10, categoryGroupName: '식비', groupCode: 'FOOD', sortOrder: 1, defaultCategory: true, active: true },
  { id: 2, ledgerId: 1, name: '카페·간식', type: 'EXPENSE', categoryGroupId: 10, categoryGroupName: '식비', groupCode: 'FOOD', sortOrder: 2, defaultCategory: true, active: true },
  { id: 3, ledgerId: 1, name: '대중교통', type: 'EXPENSE', categoryGroupId: 11, categoryGroupName: '교통·차량', groupCode: 'TRANSPORT', sortOrder: 3, defaultCategory: true, active: true },
]

/* 개인 가계부라 PERSONAL 배분 하나뿐입니다 — 거래 폼에 '차감 예산' 선택기가 뜨지 않아야 합니다. */
const budgetPeriod = {
  id: 100,
  ledgerId: 1,
  startDate: '2026-08-01',
  endDate: '2026-08-31',
  status: 'CURRENT',
  totalBudget: 1_000_000,
  reserveAmount: 0,
  prepared: true,
  allocations: [{ id: 200, source: { type: 'PERSONAL', ownerUserId: 1 }, owner: { id: 1, nickname: 'E2E 사용자' }, amount: 1_000_000, spentAmount: 120_000, currentBalance: 880_000, scheduledAmount: 0, availableAmount: 880_000 }],
  categoryBudgets: [],
}

export async function mockApi(page: Page) {
  await page.route('http://localhost:8080/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })

    if (path === '/api/auth/refresh') return json({ code: 'UNAUTHORIZED', message: '세션 없음' }, 401)
    if (path === '/api/auth/dev-login') return json({ accessToken: 'e2e-token', expiresInSeconds: 1800, user, currentLedger: ledger })
    if (path === '/api/me') return json({ user, currentLedger: ledger })
    if (path === '/api/ledgers') return json({ currentLedgerId: 1, ledgers: [ledger] })
    if (path === '/api/ledgers/1/members') return json([{ userId: 1, nickname: user.nickname, role: 'OWNER', user: { id: 1, nickname: user.nickname }, status: 'ACTIVE', joinedAt: '2026-08-01T00:00:00+09:00', leftAt: null }])
    if (path === '/api/ledgers/1/categories') return json(categories)
    if (path === '/api/ledgers/1/cards') return json([])
    if (path === '/api/ledgers/1/budget-periods/current') return json(budgetPeriod)
    if (path === '/api/notifications') return json({ unreadCount: 0, items: [], nextCursor: null })
    if (path === '/api/dashboard/current') {
      return json({
        currentLedger: ledger,
        budgetMonth: '2026-08',
        totalBudgetAmount: 1_000_000,
        totalExpenseAmount: 120_000,
        scheduledRecurringExpenseAmount: 0,
        remainingBudgetAmount: 880_000,
        recentTransactions: [],
        categorySpending: [],
        memberSpending: [],
        cardPaymentSummaries: [],
        ledger: dashboardLedger,
        period: { id: 100, startDate: '2026-08-01', endDate: '2026-08-31', totalBudget: 1_000_000 },
        sharedBudget: null,
        myBudget: { allocationId: 200, amount: 1_000_000, spentAmount: 120_000, currentBalance: 880_000, availableAmount: 880_000 },
        incomeAmount: null,
        weeklyGuide: null,
        emptyState: 'READY',
      })
    }
    return json({ code: 'NOT_FOUND', message: path }, 404)
  })
}

export async function devLogin(page: Page) {
  await page.getByRole('button', { name: '개발자 로그인 열기' }).click()
  await page.getByRole('button', { name: '개발자 로그인', exact: true }).click()
}

test('sends an unauthenticated protected route to the landing page', async ({ page }) => {
  await mockApi(page)
  await page.goto('/dashboard')
  // 로그인은 별도 라우트 없이 랜딩에서 시작합니다.
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('button', { name: '개발자 로그인 열기' })).toBeVisible()
})

test('keeps the removed /login path working as a redirect', async ({ page }) => {
  await mockApi(page)
  await page.goto('/login')
  await expect(page).toHaveURL(/\/$/)
})

test('logs in and lands on the dashboard', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await devLogin(page)
  await expect(page.getByRole('button', { name: '거래 추가' }).first()).toBeVisible()
})

test('picks a category by opening its group tile', async ({ page }) => {
  await mockApi(page)
  await page.goto('/')
  await devLogin(page)
  await page.getByRole('button', { name: '거래 추가' }).first().click()

  const drawer = page.getByRole('dialog', { name: '거래 추가' })
  await expect(drawer).toBeVisible()

  // 항목은 대분류 타일을 열기 전에는 보이지 않습니다.
  await expect(drawer.getByRole('button', { name: '장보기' })).toBeHidden()
  await drawer.getByRole('button', { name: '식비' }).click()
  await expect(drawer.getByRole('button', { name: '장보기' })).toBeVisible()
  await expect(drawer.getByRole('button', { name: '대중교통' })).toBeHidden()

  await drawer.getByRole('button', { name: '장보기' }).click()
  await expect(drawer.getByText('선택: 식비 · 장보기')).toBeVisible()

  /* 개인 가계부에는 공동 배분이 없으므로 차감 예산 선택기가 없어야 합니다.
   * SegmentedControl 은 role="radiogroup" 입니다 — 'group' 으로 찾으면 늘 0건이라 단정이 무의미해집니다. */
  await expect(drawer.getByRole('radiogroup', { name: '차감 예산' })).toHaveCount(0)
  // 선택기가 정말 없는 것이지 role 을 잘못 찾은 게 아님을 함께 확인합니다.
  await expect(drawer.getByRole('radiogroup', { name: '거래 종류' })).toHaveCount(1)
})

test('goes home when the sidebar logo is clicked', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', '사이드바는 데스크톱 셸에만 있습니다.')
  await mockApi(page)
  await page.goto('/')
  await devLogin(page)
  /* page.goto 는 전체 새로고침이라 메모리에만 있는 access token 이 사라집니다.
   * (refresh 는 401 로 목킹돼 있어 세션이 복구되지 않습니다.) 앱 안에서 이동합니다. */
  await page.getByRole('link', { name: '예산 설정' }).click()
  await expect(page).toHaveURL(/\/budget$/)
  await page.getByRole('link', { name: '우리로그 홈' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
})
