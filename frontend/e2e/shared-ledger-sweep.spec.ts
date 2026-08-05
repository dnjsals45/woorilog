import { test, expect, type Browser, type Page, type Request, type Response } from '@playwright/test'

/* 공동 가계부 흐름은 계정이 둘 필요해서 별도 브라우저 컨텍스트 두 개로 돌립니다.
 * 개발자 계정 dev1(개발자1)·dev2(개발자2)를 그대로 씁니다.
 *
 *   docker compose up -d mysql backend
 *   REAL_BACKEND=1 npx playwright test shared-ledger-sweep --project=desktop-chromium
 *
 * 검증 대상은 두 사람이 있어야만 드러나는 것들입니다 —
 * 초대·수락, 공동/개인 예산 나누기, 차감 예산 선택, 그리고 '나만 보기' 가 실제로 가려지는지. */

const DIR = process.env.SHOT_DIR ?? 'test-results/shared-sweep'
type Problem = { step: string; kind: string; detail: string }

async function newSession(browser: Browser, accountIndex: 1 | 2, problems: Problem[], stepRef: { current: string }) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push({ step: `${stepRef.current}/dev${accountIndex}`, kind: 'console', detail: m.text().slice(0, 300) })
  })
  page.on('pageerror', (e) => problems.push({ step: `${stepRef.current}/dev${accountIndex}`, kind: 'pageerror', detail: String(e).slice(0, 300) }))
  page.on('response', (r: Response) => {
    const req: Request = r.request()
    if (!req.url().includes('/api/') || r.status() < 400) return
    problems.push({
      step: `${stepRef.current}/dev${accountIndex}`,
      kind: `http ${r.status()}`,
      detail: `${req.method()} ${new URL(req.url()).pathname}`,
    })
  })

  await page.goto('/')
  await page.getByRole('button', { name: '개발자 로그인 열기' }).click()
  if (accountIndex === 2) await page.getByRole('button', { name: '개발자2' }).click()
  await page.getByRole('button', { name: '개발자 로그인', exact: true }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 })
  if (page.url().includes('/onboarding')) {
    await page.getByRole('button', { name: /이 이름으로 시작하기/ }).click()
    const enter = page.getByRole('link', { name: /개인 가계부로 들어가기/ }).first()
    await enter.waitFor({ timeout: 15_000 })
    await enter.click()
    await page.waitForURL(/\/dashboard/, { timeout: 20_000 })
  }
  return page
}

/** 사이드바의 가계부 칩. 현재 가계부 이름이 실행마다 달라서 이름 대신 위치로 잡습니다. */
function ledgerChip(page: Page) {
  return page.getByRole('complementary').getByRole('button').first()
}

/** 칩 드롭다운을 열어 현재 가계부를 바꿉니다. 이미 그 가계부면 아무것도 하지 않습니다.
 *
 * 라우팅 직후에는 사이드바가 아직 마운트되지 않았을 수 있어 칩을 먼저 기다립니다.
 * 클릭에 타임아웃을 주지 않으면 못 찾았을 때 테스트 예산 전체를 소진합니다. */
async function switchLedger(page: Page, name: string) {
  const chip = ledgerChip(page)
  await chip.waitFor({ state: 'visible', timeout: 20_000 })
  if ((await chip.innerText()).includes(name)) return
  await chip.click({ timeout: 10_000 })
  await page.getByRole('button', { name: new RegExp(name) }).last().click({ timeout: 10_000 })
  await page.waitForTimeout(1000)
}

test('shared ledger sweep', async ({ browser }, info) => {
  test.skip(!process.env.REAL_BACKEND, 'docker compose 로 띄운 실제 백엔드가 필요합니다.')
  test.setTimeout(480_000)

  const problems: Problem[] = []
  const stepRef = { current: 'boot' }
  const runId = String(Date.now()).slice(-6)
  const ledgerName = `QA 공동 ${runId}`

  const at = async (name: string, fn: () => Promise<void>) => {
    stepRef.current = name
    try {
      await fn()
    } catch (error) {
      problems.push({ step: name, kind: 'step failed', detail: String(error).split('\n')[0].slice(0, 300) })
    }
  }
  const shot = (page: Page, name: string) => page.screenshot({ path: `${DIR}/${name}.png` }).catch(() => {})

  const owner = await newSession(browser, 1, problems, stepRef)
  const partner = await newSession(browser, 2, problems, stepRef)
  let inviteUrl = ''

  await at('01-create-shared-ledger', async () => {
    // '새 공동 가계부 만들기'는 사이드바 가계부 칩 드롭다운 안에 있습니다.
    // 로그인 직후에는 AppShell 이 아직 마운트되지 않았을 수 있어 칩을 먼저 기다립니다.
    await ledgerChip(owner).waitFor({ state: 'visible', timeout: 20_000 })
    await ledgerChip(owner).click({ timeout: 10_000 })
    await owner.getByRole('button', { name: '새 공동 가계부 만들기' }).click({ timeout: 10_000 })
    await expect(owner).toHaveURL(/\/ledgers\/new$/)
    await owner.getByLabel('가계부 이름').fill(ledgerName)
    await owner.getByLabel('기간 전체 예산').pressSequentially('2000000')
    await owner.getByRole('button', { name: '가계부 만들고 초대하기' }).click()
    await owner.waitForTimeout(1200)
  })
  await shot(owner, '01-create-shared-ledger')

  await at('02-invite-link', async () => {
    const url = owner.locator('.invite-link-url')
    await expect(url).toBeVisible({ timeout: 15_000 })
    inviteUrl = (await url.innerText()).trim()
    expect(inviteUrl).toContain('/invitations/')
  })

  await at('03-partner-accepts', async () => {
    /* 초대 링크를 여는 건 전체 새로고침이라 메모리의 access token 이 사라집니다.
     * 실제 사용자도 새 브라우저에서 링크를 열면 같은 상태라, 앱이 안내하는 경로를 그대로 따라갑니다:
     * '로그인하고 확인하기' → 랜딩에서 로그인 → 저장된 복귀 경로로 초대 화면 재진입. */
    const path = new URL(inviteUrl).pathname
    await partner.goto(path)
    await partner.waitForTimeout(1500)
    const relogin = partner.getByRole('link', { name: '로그인하고 확인하기' })
    if (await relogin.isVisible().catch(() => false)) {
      await relogin.click()
      await partner.getByRole('button', { name: '개발자 로그인 열기' }).click()
      await partner.getByRole('button', { name: '개발자2' }).click()
      await partner.getByRole('button', { name: '개발자 로그인', exact: true }).click()
      await partner.waitForURL(/\/invitations\//, { timeout: 20_000 })
    }
    await partner.getByRole('button', { name: '참여하기' }).click()
    await expect(partner.getByText(new RegExp(`${ledgerName}에 참여했어요`))).toBeVisible({ timeout: 20_000 })
  })
  await shot(partner, '03-partner-accepts')

  await at('04-owner-splits-budget', async () => {
    await switchLedger(owner, ledgerName)
    await owner.getByRole('link', { name: '예산 설정', exact: true }).click()
    await expect(owner).toHaveURL(/\/budget$/)
    // 상대방이 참여했으므로 공동 예산 카드가 나와야 합니다.
    await expect(owner.getByRole('textbox', { name: '공동 예산' })).toBeVisible({ timeout: 15_000 })
    await owner.getByRole('textbox', { name: '공동 예산' }).pressSequentially('1000000')
    await owner.getByRole('textbox', { name: '개발자1 예산' }).pressSequentially('600000')
    await owner.getByRole('button', { name: '예산 저장' }).click()
    await owner.getByRole('dialog', { name: '예산을 저장할까요?' }).getByRole('button', { name: '저장' }).click()
    await owner.waitForTimeout(1200)
  })
  await shot(owner, '04-owner-splits-budget')

  await at('05-owner-adds-shared-expense', async () => {
    await owner.getByRole('link', { name: '거래 내역', exact: true }).click()
    await owner.getByRole('button', { name: '거래 추가' }).first().click()
    const drawer = owner.getByRole('dialog', { name: '거래 추가' })
    await drawer.getByLabel('금액').pressSequentially('30000')
    await drawer.getByLabel('사용처').fill(`공동 장보기 ${runId}`)
    await drawer.getByRole('button', { name: '식비' }).click()
    await drawer.getByRole('button', { name: '장보기' }).click()
    // 공동 배분이 있으므로 차감 예산 선택기가 떠야 합니다.
    await expect(drawer.getByRole('radiogroup', { name: '차감 예산' })).toBeVisible()
    await drawer.getByRole('button', { name: '저장', exact: true }).click()
    await owner.waitForTimeout(1200)
  })
  await shot(owner, '05-owner-adds-shared-expense')

  await at('06-owner-adds-private-expense', async () => {
    await owner.getByRole('button', { name: '거래 추가' }).first().click()
    const drawer = owner.getByRole('dialog', { name: '거래 추가' })
    await drawer.getByLabel('금액').pressSequentially('7000')
    await drawer.getByLabel('사용처').fill(`내 커피 ${runId}`)
    await drawer.getByRole('button', { name: '식비' }).click()
    await drawer.getByRole('button', { name: '카페·간식' }).click()
    await drawer.getByRole('radiogroup', { name: '차감 예산' }).getByRole('radio', { name: '내 예산' }).click()
    await drawer.getByRole('button', { name: '저장', exact: true }).click()
    await owner.waitForTimeout(1200)
  })
  await shot(owner, '06-owner-adds-private-expense')

  await at('07-partner-visibility', async () => {
    /* 상대방 시야는 UI 로 몰면 가계부 전환 드롭다운 때문에 불안정합니다.
     * 확인하려는 건 '나만 보기가 실제로 가려지는가' 이므로 dev2 세션의 API 로 직접 봅니다. */
    const api = partner.context().request
    const login = await api.post('http://localhost:8080/api/auth/dev-login', {
      data: { email: 'dev2@woorilog.com', nickname: '개발자2' },
    })
    const token = (await login.json()).accessToken as string
    const auth = { Authorization: `Bearer ${token}` }

    const ledgers = await (await api.get('http://localhost:8080/api/ledgers', { headers: auth })).json()
    const shared = (ledgers.ledgers as Array<{ id: number; name: string }>).find((l) => l.name === ledgerName)
    expect(shared, '상대방 목록에 방금 참여한 공동 가계부가 있어야 합니다.').toBeTruthy()

    const listed = await api.get(`http://localhost:8080/api/ledgers/${shared!.id}/transactions`, { headers: auth })
    expect(listed.status()).toBe(200)
    const body = await listed.json()
    const merchants = JSON.stringify(body)

    // 공동 예산 거래는 두 사람 모두에게 보입니다.
    expect(merchants, '공동 예산 거래가 상대방에게 보여야 합니다.').toContain(`공동 장보기 ${runId}`)
    // 상대방의 '내 예산' 거래는 기본 나만 보기라 응답에 들어가면 안 됩니다.
    expect(merchants, "상대방의 '내 예산' 거래가 노출되면 안 됩니다.").not.toContain(`내 커피 ${runId}`)
  })

  const report = problems.length
    ? problems.map((p) => `  [${p.step}] ${p.kind}: ${p.detail}`).join('\n')
    : '  (없음)'
  console.log(`\n===== 공동 가계부 SWEEP (${info.project.name}) =====\n${report}\n===== 끝 =====\n`)
})
