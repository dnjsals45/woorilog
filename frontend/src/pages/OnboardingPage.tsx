import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import logo from '../assets/logo/woorilog-logo.svg'
import { Button } from '../shared/ui/Button'
import { Icon } from '../shared/ui/Icon'

/** 서비스 닉네임으로 쓸 수 없는 예약어. 디자인 명세(온보딩.dc.html)에 정의된 목록입니다. */
const RESERVED_NICKNAMES = ['우리로그', '관리자']

function getNicknameError(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) return '닉네임을 입력해 주세요.'
  if (trimmed.length < 2) return '두 글자 이상 입력해 주세요.'
  if (RESERVED_NICKNAMES.includes(trimmed)) return '이 이름은 쓸 수 없어요. 다른 이름을 정해 주세요.'
  return ''
}

export type OnboardingPageProps = {
  initialNickname?: string
  /** '/invitations/:token' 형태의 경로. 초대 링크로 들어온 경우에만 값이 있습니다. */
  invitationReturnPath?: string | null
  /** 초대를 보낸 사람의 닉네임. 미리보기 조회가 끝나기 전에는 비어 있을 수 있습니다. */
  inviterNickname?: string
  isLoading?: boolean
  error?: string | null
  onConfirm?: (input: { nickname: string; timezone: string }) => Promise<void> | void
  /** 시작점 액션을 눌러 온보딩을 떠나기 직전에 호출됩니다(예: 저장된 복귀 경로 정리). */
  onLeave?: () => void
}

export function OnboardingPage({
  initialNickname = '',
  invitationReturnPath,
  inviterNickname,
  isLoading = false,
  error,
  onConfirm,
  onLeave,
}: OnboardingPageProps) {
  const [nickname, setNickname] = useState(initialNickname)
  const [touched, setTouched] = useState(false)
  const [step, setStep] = useState<0 | 1>(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const [timezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul')

  const nicknameError = getNicknameError(nickname)
  const showError = touched && Boolean(nicknameError)
  const trimmedNickname = nickname.trim()
  const isInvited = Boolean(invitationReturnPath)
  const inviteHref = invitationReturnPath ?? '/dashboard'
  const stepAnimation =
    dir > 0
      ? 'animate-[wl-onboarding-step-next_220ms_var(--ease-out-strong)_both]'
      : 'animate-[wl-onboarding-step-back_220ms_var(--ease-out-strong)_both]'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    if (nicknameError || isLoading || !onConfirm) return
    try {
      await onConfirm({ nickname: trimmedNickname, timezone })
    } catch {
      return
    }
    setDir(1)
    setStep(1)
  }

  function handleBackToName() {
    setDir(-1)
    setStep(0)
  }

  const actions = isInvited
    ? [
        {
          title: '초대 확인하기',
          body: inviterNickname ? `${inviterNickname}님의 공동 장부` : '공동 장부 초대',
          href: inviteHref,
          primary: true,
        },
        { title: '개인 장부로 들어가기', body: '나만 보는 장부에서 먼저 기록하기', href: '/dashboard', primary: false },
      ]
    : [
        { title: '개인 장부로 들어가기', body: '오늘 쓴 돈부터 기록해 보기', href: '/dashboard', primary: true },
        { title: '공동 장부 만들기', body: '예산을 정하고 상대방을 초대하기', href: '/ledgers/new', primary: false },
      ]

  return (
    <main className="auth-surface flex min-h-dvh flex-col">
      <header className="flex h-[72px] items-center px-6 sm:px-8">
        <Link className="flex items-center" to="/">
          <img alt="우리로그" className="h-auto w-[118px]" src={logo} />
        </Link>
      </header>

      <div className="flex flex-1 justify-center px-5 pt-8 pb-16 sm:px-8">
        <div className="w-full max-w-[560px]">
          <div className="mb-6 flex items-center gap-2.5">
            {([0, 1] as const).map((index) => (
              <span className="block h-1 flex-1 overflow-hidden rounded-full bg-[var(--wl-data-neutral-muted)]" key={index}>
                <i
                  className={`block h-full origin-left rounded-[inherit] bg-[var(--wl-color-primary)] transition-transform duration-[260ms] [transition-timing-function:var(--ease-out-strong)] ${index <= step ? 'scale-x-100' : 'scale-x-0'}`}
                />
              </span>
            ))}
            <span className="wl-tabular ml-1 shrink-0 text-xs font-bold text-[var(--wl-color-text-secondary)]">{step + 1} / 2</span>
          </div>

          {error ? (
            <p className="mb-4 rounded-xl bg-[var(--wl-danger-soft)] px-4 py-3 text-sm font-semibold text-[var(--wl-color-danger)]" role="alert">
              {error}
            </p>
          ) : null}

          {step === 0 ? (
            <section className={`auth-card flex flex-col items-start px-7 pt-[30px] pb-7 ${stepAnimation}`}>
              <h1 className="m-0 text-2xl font-extrabold tracking-[-0.03em] text-[var(--wl-color-text-main)]">어떤 이름으로 부를까요?</h1>
              <p className="mt-2.5 text-[14.5px] leading-[1.68] text-[var(--wl-color-text-body)] [text-wrap:balance]">
                카카오 이름을 그대로 가져왔어요.
                <br />
                공동 장부에서 상대방에게 보이는 이름이라 지금 바꿀 수 있어요.
              </p>

              <form className="mt-6 w-full" onSubmit={handleSubmit}>
                <label className="wl-field-label mb-2 block" htmlFor="onboarding-nickname">
                  닉네임
                </label>
                <div className="relative">
                  <input
                    aria-describedby="onboarding-nickname-help"
                    aria-invalid={showError || undefined}
                    className={`wl-input h-[52px] pr-14 text-base font-semibold ${showError ? 'wl-input--error shadow-[0_0_0_3px_var(--wl-danger-soft)]' : ''}`}
                    id="onboarding-nickname"
                    maxLength={12}
                    onChange={(event) => {
                      setNickname(event.target.value.slice(0, 12))
                      setTouched(true)
                    }}
                    value={nickname}
                  />
                  <span className="wl-tabular pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs font-semibold text-[var(--wl-color-text-secondary)]">
                    {nickname.length}/12
                  </span>
                </div>
                <p
                  className={`mt-2.5 text-xs leading-[1.6] ${showError ? 'animate-[wl-onboarding-hint_180ms_var(--ease-out-strong)_both] text-[var(--wl-color-danger)]' : 'text-[var(--wl-color-text-secondary)]'}`}
                  id="onboarding-nickname-help"
                  role={showError ? 'alert' : undefined}
                >
                  {showError ? nicknameError : '두 글자에서 열두 글자까지 쓸 수 있어요. 나중에 설정에서 바꿀 수 있어요.'}
                </p>

                <Button
                  className="mt-6"
                  disabled={Boolean(nicknameError) || isLoading}
                  fullWidth
                  loading={isLoading}
                  size="lg"
                  type="submit"
                >
                  {isLoading ? '장부를 만들고 있어요' : '이 이름으로 시작하기'}
                </Button>
              </form>
            </section>
          ) : (
            <section className={`auth-card flex flex-col items-start px-7 pt-[30px] pb-7 ${stepAnimation}`}>
              <span className="grid size-[46px] animate-[wl-onboarding-pop_240ms_40ms_var(--ease-out-strong)_both] place-items-center rounded-full bg-[var(--wl-brand-100)] text-[var(--wl-color-primary-dark)]">
                <Icon name="check" size="lg" />
              </span>
              <h1 className="mt-[18px] text-2xl font-extrabold tracking-[-0.03em] text-[var(--wl-color-text-main)]">
                {trimmedNickname}님, 개인 장부가 준비됐어요
              </h1>
              <p className="mt-2.5 text-[14.5px] leading-[1.68] text-[var(--wl-color-text-body)]">
                {isInvited
                  ? '개인 장부는 언제든 쓸 수 있어요. 받은 초대를 먼저 확인해 볼까요?'
                  : '먼저 혼자 기록해 보고, 함께 쓸 준비가 되면 공동 장부를 만들어 상대방을 초대해요.'}
              </p>

              {isInvited ? (
                <div className="mt-[22px] flex animate-[wl-onboarding-hint_200ms_var(--ease-out-strong)_both] gap-3 rounded-xl border border-[var(--wl-brand-200)] bg-[var(--wl-brand-50)] p-4">
                  <p className="min-w-0 text-[13.5px] leading-[1.66] text-[var(--wl-color-text-body)]">
                    {inviterNickname ? `${inviterNickname}님이 보낸 초대가 기다리고 있어요.` : '보낸 초대가 기다리고 있어요.'} 초대를
                    확인하고 수락하면 공동 장부로 바로 들어가요.
                  </p>
                </div>
              ) : null}

              <div className="mt-6 grid w-full gap-2.5">
                {actions.map((action) => (
                  <Link
                    className={`flex min-h-16 items-center justify-between gap-3.5 rounded-xl border px-4 py-3.5 transition-transform duration-150 active:scale-[0.97] ${
                      action.primary
                        ? 'border-[var(--wl-color-primary)] bg-[var(--wl-color-primary)] text-white'
                        : 'border-[var(--wl-color-border)] bg-[var(--wl-color-surface)] text-[var(--wl-color-text-main)]'
                    }`}
                    key={action.title}
                    onClick={() => onLeave?.()}
                    to={action.href}
                  >
                    <span className="min-w-0">
                      <strong className="block text-[15px] font-bold">{action.title}</strong>
                      <span className="mt-1 block text-xs leading-[1.6] opacity-[0.82]">{action.body}</span>
                    </span>
                    <Icon name="chevron-right" size="md" />
                  </Link>
                ))}
              </div>

              <button
                className="-mx-2.5 -mb-1.5 mt-4 min-h-11 self-start rounded-xl px-2.5 text-[13px] font-semibold text-[var(--wl-color-text-secondary)] hover:bg-[var(--wl-color-surface-subtle)] hover:text-[var(--wl-color-text-main)]"
                onClick={handleBackToName}
                type="button"
              >
                닉네임 다시 정하기
              </button>
            </section>
          )}

          <p className="mt-5 px-0.5 text-xs leading-[1.7] text-[var(--wl-color-text-secondary)]">
            개인 장부는 나만 보는 장부예요. 공동 장부를 만들거나 초대를 수락하면 장부를 바꿔가며 쓸 수 있어요.
          </p>
        </div>
      </div>
    </main>
  )
}
