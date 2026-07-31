import { CheckCircle2, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { ErrorState, PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

export type OnboardingPageProps = {
  initialNickname?: string
  invitationReturnPath?: string | null
  isLoading?: boolean
  error?: string | null
  onConfirm?: (input: { nickname: string; timezone: string }) => Promise<void> | void
}

export function OnboardingPage({
  initialNickname = '',
  invitationReturnPath,
  isLoading = false,
  error,
  onConfirm,
}: OnboardingPageProps) {
  const [nickname, setNickname] = useState(initialNickname)
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Seoul')
  const [submitted, setSubmitted] = useState(false)
  const trimmedNickname = nickname.trim()
  const isValid = trimmedNickname.length >= 1 && trimmedNickname.length <= 20

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)
    if (!isValid || !onConfirm) return
    await onConfirm({ nickname: trimmedNickname, timezone })
  }

  return (
    <main className="product-page product-page--narrow">
      <PageHeader eyebrow="WELCOME" title="우리로그에서 사용할 이름을 정해주세요" description="장부와 초대 화면에 표시되는 이름입니다. 언제든 설정에서 바꿀 수 있어요." />
      {error ? <div className="mt-6"><ErrorState title="이름을 저장하지 못했습니다." description={error} /></div> : null}
      <SurfaceCard className="mt-6 max-w-xl">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-[var(--wl-brand-100)] text-[var(--wl-color-primary-dark)]"><UserRound aria-hidden="true" size={24} /></div>
        <h2 className="mt-5 text-xl font-bold text-[var(--wl-color-text-main)]">첫 설정은 1분이면 충분해요</h2>
        {invitationReturnPath ? <p className="mt-2 rounded-xl bg-[var(--wl-color-surface-subtle)] px-4 py-3 text-sm font-medium text-[var(--wl-color-text-secondary)]">이름을 정하면 초대 확인 화면으로 돌아갑니다.</p> : <p className="mt-2 text-sm leading-6 text-[var(--wl-color-text-secondary)]">기본 개인 장부가 준비되어 있어요. 이름을 정한 뒤 바로 첫 거래를 기록할 수 있습니다.</p>}
        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-bold text-[var(--wl-color-text-body)]" htmlFor="onboarding-nickname">서비스 닉네임
            <input aria-describedby="onboarding-nickname-help onboarding-nickname-error" className="mt-2 h-12 w-full px-4 text-base font-semibold" id="onboarding-nickname" maxLength={20} onChange={(event) => setNickname(event.target.value)} placeholder="예: 민지" required value={nickname} />
          </label>
          <p className="text-xs font-medium text-[var(--wl-color-text-secondary)]" id="onboarding-nickname-help">공백을 제외하고 1~20자로 입력해주세요.</p>
          {submitted && !isValid ? <p className="text-sm font-bold text-[var(--wl-color-danger)]" id="onboarding-nickname-error" role="alert">닉네임은 1~20자로 입력해주세요.</p> : null}
          <label className="block text-sm font-bold text-[var(--wl-color-text-body)]" htmlFor="onboarding-timezone">시간대
            <select className="mt-2 h-12 w-full px-4 text-base font-semibold" id="onboarding-timezone" onChange={(event) => setTimezone(event.target.value)} value={timezone}>
              <option value="Asia/Seoul">Asia/Seoul (한국 표준시)</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="America/New_York">America/New_York</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </label>
          <button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--wl-color-primary)] px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300" disabled={isLoading} type="submit"><CheckCircle2 aria-hidden="true" size={18} />{isLoading ? '저장 중...' : '이 이름으로 시작하기'}</button>
        </form>
      </SurfaceCard>
    </main>
  )
}
