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

  page.on('console', (m) => {
    if (m.type() === 'error') problems.push({ step, kind: 'console', detail: m.text().slice(0, 300) })
  })
  page.on('pageerror', (e) => problems.push({ step, kind: 'pageerror', detail: String(e).slice(0, 300) }))
  page.on('response', (r: Response) => {
    const req: Request = r.request()
    if (!req.url().includes('/api/')) return
    if (r.status() >= 400) {
      problems.push({ step, kind: `http ${r.status()}`, detail: `${req.method()} ${new URL(req.url()).pathname}` })
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

  await page.setViewportSize({ width: 1440, height: 900 })

  await at('01-landing', async () => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: '개발자 로그인 열기' })).toBeVisible()
  })

  await at('02-login', async () => {
    await page.getByRole('button', { name: '개발자 로그인 열기' }).click()
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
    await page.getByRole('link', { name: '예산 설정' }).click()
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
    await page.getByRole('link', { name: '거래 내역' }).click()
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
    await page.getByRole('link', { name: '자동 기록' }).click()
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
    await page.getByRole('link', { name: '분석' }).click()
    await expect(page).toHaveURL(/\/analysis$/)
    await page.waitForTimeout(1500)
  })

  await at('12-settings-categories', async () => {
    // 사이드바 '설정'은 onSettings prop 때문에 <a> 가 아니라 <button> 으로 그려집니다.
    await page.getByRole('button', { name: '설정', exact: true }).click()
    await expect(page).toHaveURL(/\/settings$/)
    await page.getByRole('button', { name: '카테고리' }).first().click()
    await page.waitForTimeout(1000)
  })

  await at('13-import-modal', async () => {
    await page.getByRole('link', { name: '거래 내역' }).click()
    await page.getByRole('button', { name: '이미지로 거래 가져오기' }).first().click()
    await page.waitForTimeout(1000)
  })

  await at('14-period-summary', async () => {
    await page.keyboard.press('Escape')
    await page.getByRole('link', { name: '홈', exact: true }).click()
    await page.waitForTimeout(1500)
  })

  const report = problems.length
    ? problems.map((p) => `  [${p.step}] ${p.kind}: ${p.detail}`).join('\n')
    : '  (없음)'
  console.log(`\n===== SWEEP 결과 (${info.project.name}) =====\n${report}\n===== 끝 =====\n`)
})
