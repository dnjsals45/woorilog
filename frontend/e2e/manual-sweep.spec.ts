import { test, expect, type Request, type Response } from '@playwright/test'

/* 목을 쓰지 않고 docker compose 로 띄운 실제 백엔드를 상대로 전 화면을 훑습니다.
 * 목킹된 e2e 로는 계약 불일치·서버 검증 실패를 잡을 수 없어서 따로 둡니다.
 *
 *   docker compose up -d mysql backend
 *   REAL_BACKEND=1 npx playwright test manual-sweep --project=desktop-chromium
 *
 * 단정으로 막기보다 "실제로 뭐가 깨지는지" 기록하는 게 목적이라, 실패해도 계속 진행하고
 * 콘솔 오류와 4xx/5xx 응답을 모아 마지막에 출력합니다. */

const DIR = process.env.SHOT_DIR ?? 'test-results/sweep'
type Problem = { step: string; kind: string; detail: string }

test.describe.configure({ mode: 'serial' })

test('real-backend sweep', async ({ page }, info) => {
  /* CI 는 백엔드를 띄우지 않으므로 기본 실행에서는 건너뜁니다.
   * 로컬에서 docker compose 를 띄운 뒤 REAL_BACKEND=1 로 명시해 돌립니다. */
  test.skip(!process.env.REAL_BACKEND, 'docker compose 로 띄운 실제 백엔드가 필요합니다.')
  test.setTimeout(180_000)
  const problems: Problem[] = []
  let step = 'boot'
  const runId = String(Date.now()).slice(-6)

  /* 응답이 프론트 타입과 어긋나면 apiRequest 가 '[api-contract]' 로 콘솔에 남깁니다
   * (shared/api/contract.ts). 이건 다른 콘솔 잡음과 달리 반드시 고쳐야 하므로 따로 모으고,
   * 여러 줄짜리 메시지가 잘리지 않게 길이도 넉넉히 둡니다. */
  const contractViolations: string[] = []
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const text = m.text()
    if (text.includes('[api-contract]')) {
      contractViolations.push(`[${step}] ${text.slice(0, 2000)}`)
      return
    }
    problems.push({ step, kind: 'console', detail: text.slice(0, 300) })
  })
  page.on('pageerror', (e) => problems.push({ step, kind: 'pageerror', detail: String(e).slice(0, 300) }))
  /* 계약 위반이 '없음' 인 게 '검사했는데 깨끗하다' 인지 '아예 안 불렀다' 인지 구분하려고
   * 실제로 오간 엔드포인트를 모아 마지막에 같이 출력합니다. */
  const touched = new Set<string>()
  page.on('response', (r: Response) => {
    const req: Request = r.request()
    /* url 전체가 아니라 pathname 앞부분으로 걸러야 합니다.
     * 'features/analytics/api/...' 같은 vite 모듈 요청에도 '/api/' 가 들어 있습니다. */
    const { pathname } = new URL(req.url())
    if (!pathname.startsWith('/api/')) return
    const path = pathname.replace(/\/\d+(?=\/|$)/g, '/{id}')
    touched.add(`${req.method()} ${path}`)
    if (r.status() >= 400) {
      problems.push({ step, kind: `http ${r.status()}`, detail: `${req.method()} ${path}` })
    }
  })

  const shot = async (name: string) => {
    await page.screenshot({ path: `${DIR}/${name}.png` }).catch(() => {})
  }
  const at = async (name: string, fn: () => Promise<void>) => {
    step = name
    try {
      await fn()
    } catch (error) {
      problems.push({ step, kind: 'step failed', detail: String(error).split('\n')[0].slice(0, 300) })
    }
    await shot(name)
  }

  /* 데스크톱은 사이드바, 모바일은 5칸 탭바 + '더보기' 시트라 도달 경로가 다릅니다.
   * 같은 시나리오를 두 셸에서 그대로 돌리려고 이동만 감싸 둡니다. */
  const mobile = info.project.name !== 'desktop-chromium'
  if (!mobile) await page.setViewportSize({ width: 1440, height: 900 })

  const TABS: Record<string, string> = { 홈: '홈', '거래 내역': '거래 내역', 예산: '예산 설정', 분석: '분석' }
  async function go(target: '홈' | '거래 내역' | '예산' | '분석' | '자동 기록' | '설정') {
    if (!mobile) {
      const label = target === '예산' ? '예산 설정' : target
      if (target === '설정') await page.getByRole('button', { name: '설정', exact: true }).click()
      else await page.getByRole('link', { name: label, exact: true }).click()
      return
    }
    if (target in TABS) {
      await page.getByRole('link', { name: target, exact: true }).click()
      return
    }
    /* 자동 기록·설정은 탭바에 없고 '더보기' 시트 안에 있습니다.
     * 시트 항목의 접근 이름은 제목 + 설명이 합쳐진 문자열이라 부분 일치로 찾습니다. */
    await page.getByRole('button', { name: '더보기' }).click()
    await page.getByRole('button', { name: new RegExp(`^${target}`) }).click()
  }

  await at('01-landing', async () => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: '개발자 로그인 열기' })).toBeVisible()
  })

  await at('02-login', async () => {
    /* 공동 가계부 스윕이 dev1·dev2 의 현재 가계부를 바꾸므로, 이 스윕은 dev3 을 따로 씁니다.
     * 두 스윕이 같은 계정을 공유하면 서로의 상태에 따라 결과가 흔들립니다. */
    await page.getByRole('button', { name: '개발자 로그인 열기' }).click()
    await page.getByRole('button', { name: '개발자3' }).click()
    await page.getByRole('button', { name: '개발자 로그인', exact: true }).click()
    await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 15_000 })
  })

  // 첫 로그인이면 닉네임 확인 화면이 먼저 뜹니다.
  await at('03-onboarding', async () => {
    if (!page.url().includes('/onboarding')) return
    await page.getByRole('button', { name: /이 이름으로 시작하기/ }).click()
    await page.waitForTimeout(1500)
    const enter = page.getByRole('link', { name: /개인 가계부로 들어가기/ }).first()
    if (await enter.isVisible().catch(() => false)) await enter.click()
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
  })

  await at('04-dashboard', async () => {
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 })
    await expect(page.getByRole('button', { name: '거래 추가' }).first()).toBeVisible()
  })

  await at('05-budget-setup', async () => {
    await go('예산')
    await expect(page).toHaveURL(/\/budget$/)
    /* 같은 DB 에 반복해서 돌리므로 매번 다른 금액을 넣어 '변경 있음' 상태를 만듭니다. */
    const amount = String(1_000_000 + (Date.now() % 90) * 10_000)
    const total = page.getByLabel('기간 전체 예산')
    await total.fill('')
    await total.pressSequentially(amount)
    await expect(page.getByRole('button', { name: '예산 저장' })).toBeEnabled()
    await page.getByRole('button', { name: '예산 저장' }).click()
    await expect(page.getByRole('dialog', { name: '예산을 저장할까요?' })).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: '저장' }).click()
    await page.waitForTimeout(1500)
  })

  await at('06-budget-after-save', async () => {
    await expect(page.getByRole('button', { name: '예산 저장' })).toBeDisabled()
  })

  await at('07-transaction-add', async () => {
    await go('거래 내역')
    await page.getByRole('button', { name: '거래 추가' }).first().click()
    const drawer = page.getByRole('dialog', { name: '거래 추가' })
    await expect(drawer).toBeVisible()
    await drawer.getByLabel('금액').pressSequentially('12000')
    await drawer.getByLabel('사용처').fill(`QA 점심 ${runId}`)
    await drawer.getByRole('button', { name: '식비' }).click()
    await drawer.getByRole('button', { name: '외식' }).click()
    await drawer.getByRole('button', { name: '저장', exact: true }).click()
    await page.waitForTimeout(2000)
  })

  await at('08-transaction-list', async () => {
    await expect(page.getByText(`QA 점심 ${runId}`).first()).toBeVisible({ timeout: 10_000 })
  })

  await at('09-recurring-add', async () => {
    await go('자동 기록')
    await expect(page).toHaveURL(/\/recurring$/)
    await page.getByRole('button', { name: '반복 지출 추가' }).click()
    const modal = page.getByRole('dialog', { name: '반복 지출 추가' })
    await expect(modal).toBeVisible()
    await modal.getByLabel('이름').fill(`QA 구독료 ${runId}`)
    await modal.getByLabel('금액').pressSequentially('9900')
    await modal.getByLabel('카테고리').selectOption({ label: '통신' }).catch(async () => {
      await modal.getByLabel('카테고리').selectOption({ index: 1 })
    })
    await modal.getByLabel('차감 예산').selectOption({ index: 1 })
    await modal.getByRole('button', { name: '반복 지출 저장' }).click()
    await page.waitForTimeout(2000)
  })

  await at('10-recurring-delete', async () => {
    await expect(page.getByText(`QA 구독료 ${runId}`).first()).toBeVisible({ timeout: 10_000 })
    await page.getByText(`QA 구독료 ${runId}`).first().click()
    await page.getByRole('button', { name: '자동 기록 삭제' }).click()
    await page.waitForTimeout(2000)
    // 삭제한 계획이 목록에 남아 있으면 안 됩니다.
    await expect(page.getByText(`QA 구독료 ${runId}`)).toHaveCount(0)
  })

  await at('11-analysis', async () => {
    await go('분석')
    await expect(page).toHaveURL(/\/analysis$/)
    await page.waitForTimeout(1500)
  })

  await at('12-settings-categories', async () => {
    await go('설정')
    await expect(page).toHaveURL(/\/settings$/)
    await page.getByRole('button', { name: '카테고리' }).first().click()
    await page.waitForTimeout(1000)
  })

  await at('13-import-modal', async () => {
    await go('거래 내역')
    await page.getByRole('button', { name: '이미지로 거래 가져오기' }).first().click()
    await page.waitForTimeout(1000)
  })

  await at('14-period-summary', async () => {
    await page.keyboard.press('Escape')
    await go('홈')
    await page.waitForTimeout(1500)
  })

  const report = problems.length
    ? problems.map((p) => `  [${p.step}] ${p.kind}: ${p.detail}`).join('\n')
    : '  (없음)'
  console.log(`\n===== 전 화면 자동 점검 결과 (${info.project.name}) =====\n${report}\n===== 끝 =====\n`)
  console.log(`\n===== 응답 계약 위반 =====\n${contractViolations.join('\n') || '  (없음)'}\n===== 끝 =====\n`)
  console.log(`\n===== 이번에 실제로 오간 엔드포인트 =====\n${[...touched].sort().map((line) => `  ${line}`).join('\n')}\n===== 끝 =====\n`)

  /* 나머지는 참고용 기록이지만 계약 위반은 무조건 고쳐야 하므로 여기서만 실패시킵니다. */
  expect(contractViolations, '서버 응답이 프론트 타입과 어긋났습니다.').toEqual([])
})
