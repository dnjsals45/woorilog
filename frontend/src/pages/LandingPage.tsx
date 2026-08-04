import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import landingBackground from '../assets/landing/landing-desk-bg.jpg'
import landingReceipts from '../assets/landing/landing-receipts.jpg'
import logo from '../assets/logo/woorilog-logo.svg'
import { getKakaoLoginUrl } from '../features/auth/api/authApi'
import { formatWon } from '../shared/lib/money'
import { getAccessToken } from '../shared/api/client'
import { Icon } from '../shared/ui/Icon'

/* 한 기간 예산을 네 갈래로 나누는 예시 그림입니다. 실제 사용자 데이터가 아니라
 * "예산 구조" 개념을 설명하기 위한 랜딩 전용 예시 수치이며, 디자인 원본(랜딩.dc.html)의
 * SPLIT 상수를 그대로 옮긴 것입니다. */
const BUDGET_SPLIT = [
  { label: '공동 예산', amount: 1_120_000, percent: 56, fill: 'var(--wl-color-primary)', ink: '#fff', note: '월세, 장보기처럼 함께 쓰는 돈' },
  { label: '홍길동', amount: 500_000, percent: 25, fill: 'var(--wl-data-blue)', ink: '#fff', note: '각자 알아서 쓰는 개인 예산' },
  { label: '홍길순', amount: 260_000, percent: 13, fill: 'var(--wl-data-violet)', ink: '#fff', note: '상대방 예산은 총액만 공유' },
  { label: '예비비', amount: 120_000, percent: 6, fill: 'var(--wl-data-neutral-soft)', ink: 'var(--wl-color-text-body)', note: '옮겨서 쓰는 여유분' },
] as const

const COMPARISON_ROWS = [
  { label: '혼자 쓰면', body: '한 사람이 영수증을 모으고, 나머지 한 사람은 결과만 듣습니다.', tone: 'muted' },
  { label: '합치면', body: '개인 소비까지 다 보여서 기록을 줄이거나 숨기게 됩니다.', tone: 'muted' },
  { label: '우리로그', body: '공동 예산은 함께 보고, 내 예산 거래는 나만 볼지 직접 고릅니다.', tone: 'brand' },
] as const

const SHARED_ROWS = [
  '공동 예산의 전체 금액, 사용액과 남은 금액',
  '공동 예산에서 차감한 모든 거래',
  '상대방 개인 예산의 총액과 사용액',
  '예비비를 옮긴 기록과 예산 변경 알림',
]

const PERSONAL_ROWS = [
  '내 예산에서 차감한 거래의 사용처와 메모',
  '내가 나만 보기로 한 거래',
  '내 카드의 식별 정보',
  '내 예산의 주간 권장액 알림',
]

const FLOW_ROWS = [
  { verb: '기록해요', body: '금액 키패드가 먼저 열립니다. 사용처를 입력하면 지난 기록을 보고 카테고리를 먼저 채워 둡니다.' },
  { verb: '나눠요', body: '이 지출을 공동에서 뺄지 내 예산에서 뺄지 저장 전에 확인합니다. 상대방 예산은 선택지에 없습니다.' },
  { verb: '돌아봐요', body: '기간이 끝나면 사용액과 남은 돈, 카테고리별 지출, 다음 기간에 이어지는 고정비를 한 장으로 정리합니다.' },
]

const FAQ_ROWS = [
  { question: '개인 지출까지 상대방에게 다 보이나요?', answer: '아니요. 내 예산에서 차감한 거래는 기본적으로 나만 봅니다. 상대방에게는 예산 총액과 사용액만 보이고, 개별 거래는 내가 함께 보기로 한 것만 보입니다.' },
  { question: '남은 예산은 다음 기간으로 넘어가나요?', answer: '넘기지 않습니다. 남은 돈과 초과한 돈은 끝난 기간의 결과로만 남고, 다음 기간 예산은 이번 기간 설정을 그대로 복사해 시작합니다.' },
  { question: '한 명이 그만두면 기록은 어떻게 되나요?', answer: '함께 쓴 기간의 기록은 두 사람 모두 읽을 수 있게 남습니다. 다만 고정비와 할부 자동 등록은 잠시 멈추고, 남은 사람이 필요한 것만 다시 켭니다.' },
  { question: '수입을 기록하면 예산이 늘어나나요?', answer: '자동으로 늘지 않습니다. 수입은 수입 내역과 통계에만 반영하고, 쓸 수 있는 돈을 늘리려면 예산 설정에서 직접 전체 예산을 바꿉니다.' },
]

/** 뷰포트에 들어오면 은은하게 떠오르는 섹션. IntersectionObserver가 없는 환경(테스트 등)에서는
 * 그냥 바로 보이는 상태로 렌더합니다. */
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    const node = ref.current
    if (!node || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.unobserve(entry.target)
          }
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`wl-landing-reveal ${visible ? '' : 'wl-landing-reveal--hidden'} ${className}`}>
      {children}
    </div>
  )
}

function KakaoCta({ label, size = 'md', className = '', onClick }: { label: string; size?: 'md' | 'lg'; className?: string; onClick?: () => void }) {
  const sizing = size === 'lg' ? 'min-h-13 gap-2.5 px-6 text-base' : 'min-h-11 gap-2 px-4 text-sm'
  return (
    <button
      className={`wl-landing-cta inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[#FEE500] font-bold text-[#191600] shadow-[var(--wl-shadow-card)] ${sizing} ${className}`}
      onClick={onClick}
      type="button"
    >
      <Icon name="message-circle" size={size === 'lg' ? 'lg' : 'md'} />
      {label}
    </button>
  )
}

function AuthedCta({ label, size = 'md', className = '' }: { label: string; size?: 'md' | 'lg'; className?: string }) {
  const sizing = size === 'lg' ? 'min-h-13 gap-2.5 px-6 text-base' : 'min-h-11 gap-2 px-4 text-sm'
  return (
    <Link
      className={`wl-landing-cta inline-flex items-center justify-center whitespace-nowrap rounded-full bg-[var(--wl-color-primary)] font-bold text-white shadow-[var(--wl-shadow-card)] ${sizing} ${className}`}
      to="/dashboard"
    >
      {label}
    </Link>
  )
}

function LoginModal({ onClose }: { onClose: () => void }) {
  const [kakaoError, setKakaoError] = useState(false)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  async function handleKakaoLogin() {
    setKakaoError(false)
    try {
      const { loginUrl } = await getKakaoLoginUrl()
      window.location.assign(loginUrl)
    } catch {
      setKakaoError(true)
    }
  }

  return (
    <div className="wl-modal-scrim" onClick={onClose} role="presentation">
      <div
        aria-label="카카오로 시작하기"
        aria-modal="true"
        className="wl-modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        style={{ width: 'min(420px, 100%)' }}
      >
        <h2 className="text-xl font-extrabold tracking-[-0.025em] text-[var(--wl-color-text-main)]">카카오로 시작하기</h2>
        <p className="mt-2.5 text-[14.5px] leading-relaxed text-[var(--wl-color-text-body)]">처음이면 닉네임을 정하고 개인 가계부가 만들어져요. 이미 계정이 있으면 바로 대시보드로 들어갑니다.</p>
        <button
          className="wl-landing-cta mt-5 inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-[var(--wl-radius-md)] bg-[#FEE500] text-base font-bold text-[#191600]"
          onClick={handleKakaoLogin}
          type="button"
        >
          <Icon name="message-circle" size="lg" />
          카카오 계정으로 계속
        </button>
        {kakaoError ? (
          <p className="mt-3 rounded-[var(--wl-radius-md)] bg-[var(--wl-danger-soft)] px-3 py-2 text-sm text-[var(--wl-color-danger)]">카카오 로그인이 아직 설정되지 않았거나 연결에 실패했습니다.</p>
        ) : null}
        <p className="mt-4 text-[12.5px] leading-relaxed text-[var(--wl-color-text-secondary)]">초대 링크를 받았다면 로그인 후 초대 확인 화면으로 돌아옵니다.</p>
        <button
          className="mt-3.5 min-h-11 w-full rounded-xl text-[13.5px] font-semibold text-[var(--wl-color-text-secondary)] hover:bg-[var(--wl-color-surface-subtle)] hover:text-[var(--wl-color-text-main)]"
          onClick={onClose}
          type="button"
        >
          닫기
        </button>
      </div>
    </div>
  )
}

export function LandingPage() {
  const [loginOpen, setLoginOpen] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(-1)
  const isAuthenticated = Boolean(getAccessToken())

  function renderCta(size: 'md' | 'lg', className?: string) {
    return isAuthenticated ? (
      <AuthedCta className={className} label="내 가계부로 가기" size={size} />
    ) : (
      <KakaoCta className={className} label="카카오로 시작하기" onClick={() => setLoginOpen(true)} size={size} />
    )
  }

  return (
    <div className="bg-[var(--wl-color-surface)] text-[var(--wl-color-text-main)]" style={{ wordBreak: 'keep-all' }}>
      <header className="wl-landing-header sticky top-0 z-20 flex h-18 items-center justify-between gap-6 border-b border-[var(--wl-color-border)] bg-white/88 px-6 backdrop-blur-md">
        <a className="flex flex-none items-center" href="#top">
          <img alt="우리로그" className="block h-auto w-33" src={logo} />
        </a>
        <nav className="flex items-center gap-4 sm:gap-5.5">
          <a className="hidden text-sm font-semibold text-[var(--wl-color-text-body)] sm:inline" href="#budget">예산 구조</a>
          <a className="hidden text-sm font-semibold text-[var(--wl-color-text-body)] sm:inline" href="#features">기능</a>
          <a className="hidden text-sm font-semibold text-[var(--wl-color-text-body)] md:inline" href="#privacy">보이는 범위</a>
          <a className="hidden text-sm font-semibold text-[var(--wl-color-text-body)] md:inline" href="#faq">자주 묻는 질문</a>
          {renderCta('md')}
        </nav>
      </header>

      <main id="top">
        <section className="relative isolate bg-[var(--wl-color-surface-subtle)]">
          <img
            alt="창가 책상에서 노트북으로 가계부를 보는 장면"
            className="absolute inset-0 -z-20 hidden h-full w-full object-cover object-right lg:block"
            src={landingBackground}
          />
          <div
            className="absolute inset-0 -z-10 hidden lg:block"
            style={{
              background:
                'linear-gradient(100deg, color-mix(in srgb, var(--wl-color-surface-subtle) 98%, transparent) 0%, color-mix(in srgb, var(--wl-color-surface-subtle) 94%, transparent) 38%, color-mix(in srgb, var(--wl-color-surface-subtle) 58%, transparent) 62%, color-mix(in srgb, var(--wl-color-surface-subtle) 8%, transparent) 82%)',
            }}
          />
          <div className="mx-auto grid max-w-[1160px] grid-cols-1 px-6 py-16 sm:py-20 lg:py-28">
            <div className="wl-landing-hero-copy min-w-0 max-w-[600px]">
              <h1 className="m-0 font-extrabold leading-[1.16] tracking-[-0.035em]" style={{ fontSize: 'clamp(34px, 4.2vw, 54px)', textWrap: 'pretty' }}>
                함께 쓰는 돈을<br />서로 감시하지 않고 기록해요
              </h1>
              <p className="mt-5 max-w-[47ch] text-[17.5px] leading-[1.68] text-[var(--wl-color-text-body)]">
                공동 생활비와 각자 예산을 나눠 운영하고, 이번 기간에 남은 돈을 두 사람이 같은 화면에서 봅니다.
              </p>
              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                {renderCta('lg', 'w-full sm:w-auto')}
                <a
                  className="wl-landing-cta inline-flex min-h-13 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--wl-color-border-strong)] bg-[color-mix(in_srgb,var(--wl-color-surface-subtle)_92%,transparent)] px-4.5 text-[15px] font-semibold text-[var(--wl-color-text-body)] sm:w-auto"
                  href="#budget"
                >
                  어떻게 나누는지 보기
                  <Icon name="chevron-right" size="md" />
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-[var(--wl-color-border)] bg-[var(--wl-color-background)]">
          <Reveal className="mx-auto grid max-w-[1160px] grid-cols-1 gap-14 px-6 py-20 md:grid-cols-2">
            <div className="min-w-0">
              <h2 className="m-0 max-w-[22ch] font-extrabold leading-[1.28] tracking-[-0.03em]" style={{ fontSize: 'clamp(26px, 2.8vw, 34px)' }}>
                가계부를 멈추는 이유는 게을러서가 아니에요
              </h2>
              <p className="mt-4.5 max-w-[44ch] text-base leading-[1.7] text-[var(--wl-color-text-body)]">
                둘이 쓰는 돈인데 기록은 혼자 합니다. 누가 얼마를 썼는지 확인하는 일이 대화가 아니라 확인 작업이 되면 오래 가지 못합니다.
              </p>
            </div>
            <div className="grid min-w-0 content-start gap-0 py-1">
              {COMPARISON_ROWS.map((row, index) => (
                <div
                  className="grid grid-cols-[104px_minmax(0,1fr)] gap-5 py-4"
                  key={row.label}
                  style={index < COMPARISON_ROWS.length - 1 ? { borderBottom: '1px solid var(--wl-color-border)' } : undefined}
                >
                  <span className={`text-[13px] font-bold ${row.tone === 'brand' ? 'text-[var(--wl-color-primary-dark)]' : 'text-[var(--wl-color-text-secondary)]'}`}>{row.label}</span>
                  <span className="text-[15px] leading-[1.6]">{row.body}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="border-t border-[var(--wl-color-border)]" id="budget">
          <Reveal className="mx-auto max-w-[1160px] px-6 py-21">
            <h2 className="m-0 max-w-[24ch] font-extrabold leading-[1.28] tracking-[-0.03em]" style={{ fontSize: 'clamp(26px, 2.8vw, 34px)' }}>
              한 기간의 예산을 네 갈래로 나눠요
            </h2>
            <p className="mt-4 max-w-[56ch] text-base leading-[1.7] text-[var(--wl-color-text-body)]">
              기준은 달력 월이 아니라 월급날입니다. 시작일을 정하면 그날부터 다음 시작일 전날까지가 한 기간이 됩니다.
            </p>

            <div className="mt-10 flex h-19 gap-1 overflow-hidden rounded-[var(--wl-radius-md)]">
              {BUDGET_SPLIT.map((row) => (
                <div className="grid min-w-0 place-items-center" key={row.label} style={{ flex: row.percent, background: row.fill, color: row.ink }}>
                  <strong className="text-[15px] font-extrabold tracking-[-0.02em]">{row.percent}%</strong>
                </div>
              ))}
            </div>
            <ul className="mt-5.5 grid list-none grid-cols-2 gap-5 p-0 sm:grid-cols-4">
              {BUDGET_SPLIT.map((row) => (
                <li className="min-w-0" key={row.label}>
                  <strong className="block text-[15px] font-bold">{row.label}</strong>
                  <span className="wl-tabular mt-1 block text-xl font-extrabold tracking-[-0.03em]">{formatWon(row.amount)}</span>
                  <span className="mt-1.5 block text-[13.5px] leading-[1.6] text-[var(--wl-color-text-secondary)]">{row.note}</span>
                </li>
              ))}
            </ul>
            <p className="mt-7 max-w-[60ch] text-[14.5px] leading-[1.7] text-[var(--wl-color-text-secondary)]">
              예비비는 바로 차감하지 않습니다. 필요할 때 공동 예산이나 각자 예산으로 옮겨 쓰고, 옮긴 기록은 두 사람 모두에게 남습니다.
            </p>
          </Reveal>
        </section>

        <section className="border-t border-[var(--wl-color-border)] bg-[var(--wl-color-background)]" id="features">
          <Reveal className="mx-auto max-w-[1160px] px-6 py-21">
            <h2 className="m-0 max-w-[20ch] font-extrabold leading-[1.28] tracking-[-0.03em]" style={{ fontSize: 'clamp(26px, 2.8vw, 34px)' }}>
              기록하는 시간을 줄이는 쪽으로 만들었어요
            </h2>
            <div className="mt-9 grid auto-rows-[minmax(0,auto)] grid-cols-1 gap-4 lg:grid-cols-[1.35fr_1fr]">
              <article className="flex flex-col overflow-hidden rounded-[var(--wl-radius-lg)] border border-[var(--wl-color-border)] bg-[var(--wl-color-surface)] lg:row-span-2">
                <div className="p-6.5 pb-0">
                  <h3 className="m-0 text-xl font-bold tracking-[-0.02em]">영수증과 카드 내역 캡처를 한 번에</h3>
                  <p className="mt-2.5 text-[15px] leading-[1.68] text-[var(--wl-color-text-body)]">
                    여러 장을 올리면 거래 후보를 하나의 목록으로 모읍니다. 중복 의심 건은 저장 대상에서 빼 두고, 카테고리와 차감 예산은 여러 건을 골라 한 번에 바꿉니다.
                  </p>
                </div>
                <img
                  alt=""
                  className="mt-6 block aspect-[5/3] w-full border-t border-[var(--wl-color-border)] object-cover"
                  loading="lazy"
                  src={landingReceipts}
                />
              </article>
              <article className="rounded-[var(--wl-radius-lg)] border border-[var(--wl-color-border)] bg-[var(--wl-brand-50)] p-6.5">
                <h3 className="m-0 text-xl font-bold tracking-[-0.02em]">월급날 기준 예산 기간</h3>
                <p className="mt-2.5 text-[15px] leading-[1.68] text-[var(--wl-color-text-body)]">
                  시작일을 10일로 두면 10일부터 다음 달 9일까지를 한 기간으로 계산합니다. 남은 날짜에 맞춰 하루 쓸 수 있는 돈도 함께 보여줍니다.
                </p>
              </article>
              <article className="rounded-[var(--wl-radius-lg)] border border-[var(--wl-color-border)] bg-[var(--wl-color-surface)] p-6.5">
                <h3 className="m-0 text-xl font-bold tracking-[-0.02em]">고정비와 할부는 알아서</h3>
                <p className="mt-2.5 text-[15px] leading-[1.68] text-[var(--wl-color-text-body)]">
                  월세와 구독료는 예정일에 자동 기록되고, 할부는 회차 금액이 그 결제일이 속한 기간에 반영됩니다. 남은 예정액을 뺀 실제 쓸 수 있는 돈이 대시보드에 뜹니다.
                </p>
              </article>
              <article className="grid grid-cols-1 overflow-hidden rounded-[var(--wl-radius-lg)] border border-[var(--wl-color-border)] bg-[var(--wl-color-surface)] sm:grid-cols-[minmax(0,1fr)_300px] lg:col-span-2">
                <div className="p-6.5">
                  <h3 className="m-0 text-xl font-bold tracking-[-0.02em]">일요일 밤에 도착하는 다음 주 기준액</h3>
                  <p className="mt-2.5 max-w-[52ch] text-[15px] leading-[1.68] text-[var(--wl-color-text-body)]">
                    이번 주에 더 쓴 만큼만 다음 주 기준액에서 빼서 알려줍니다. 아껴 쓴 주에는 더 쓰라고 권하지 않습니다.
                  </p>
                </div>
                {/* TODO(asset): 일요일 저녁 집 안 분위기 사진, 가로세로 16:10 */}
                <div className="grid min-h-45 place-items-center gap-1.5 border-t border-dashed border-[var(--wl-color-border-strong)] bg-[var(--wl-color-surface-subtle)] text-center sm:border-t-0 sm:border-l">
                  <span className="text-[13.5px] font-bold text-[var(--wl-color-text-secondary)]">이미지 필요</span>
                  <span className="max-w-[26ch] text-[12.5px] leading-[1.6] text-[var(--wl-color-text-secondary)]">일요일 저녁 집 안 분위기<br />가로 16:10</span>
                </div>
              </article>
            </div>
          </Reveal>
        </section>

        <section className="border-t border-[var(--wl-color-border)]" id="privacy">
          <Reveal className="mx-auto max-w-[1160px] px-6 py-21">
            <h2 className="m-0 max-w-[24ch] font-extrabold leading-[1.28] tracking-[-0.03em]" style={{ fontSize: 'clamp(26px, 2.8vw, 34px)' }}>
              무엇을 함께 보고 무엇을 나만 볼지 정해요
            </h2>
            <div className="mt-9 grid grid-cols-1 gap-14 md:grid-cols-2">
              <div className="min-w-0">
                <strong className="block border-b-2 border-[var(--wl-color-primary)] pb-3.5 text-[15px] font-bold">함께 보는 것</strong>
                {SHARED_ROWS.map((row) => (
                  <p className="m-0 border-b border-[var(--wl-color-border)] py-3.5 text-[15px] leading-[1.6]" key={row}>{row}</p>
                ))}
              </div>
              <div className="min-w-0">
                <strong className="block border-b-2 border-[var(--wl-color-border-strong)] pb-3.5 text-[15px] font-bold">나만 보는 것</strong>
                {PERSONAL_ROWS.map((row) => (
                  <p className="m-0 border-b border-[var(--wl-color-border)] py-3.5 text-[15px] leading-[1.6] text-[var(--wl-color-text-body)]" key={row}>{row}</p>
                ))}
              </div>
            </div>
          </Reveal>
        </section>

        <section className="border-t border-[var(--wl-color-border)] bg-[var(--wl-color-background)]">
          <Reveal className="mx-auto max-w-[1160px] px-6 py-21">
            {FLOW_ROWS.map((row, index) => (
              <div
                className="grid grid-cols-1 items-baseline gap-4 py-6.5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-8"
                key={row.verb}
                style={index < FLOW_ROWS.length - 1 ? { borderBottom: '1px solid var(--wl-color-border)' } : undefined}
              >
                <strong className="text-[30px] font-extrabold tracking-[-0.03em]">{row.verb}</strong>
                <p className="m-0 max-w-[58ch] text-base leading-[1.7] text-[var(--wl-color-text-body)]">{row.body}</p>
              </div>
            ))}
          </Reveal>
        </section>

        <section className="border-t border-[var(--wl-color-border)]" id="faq">
          <Reveal className="mx-auto max-w-[820px] px-6 py-21">
            <h2 className="m-0 mb-7 font-extrabold tracking-[-0.03em]" style={{ fontSize: 'clamp(26px, 2.8vw, 34px)' }}>자주 묻는 질문</h2>
            {FAQ_ROWS.map((row, index) => {
              const open = openFaqIndex === index
              return (
                <div className="border-b border-[var(--wl-color-border)]" key={row.question}>
                  <button
                    aria-expanded={open}
                    className="flex min-h-16 w-full items-center justify-between gap-4 py-3 text-left text-[16.5px] font-semibold hover:text-[var(--wl-color-primary-dark)]"
                    onClick={() => setOpenFaqIndex(open ? -1 : index)}
                    type="button"
                  >
                    {row.question}
                    <span className={`wl-landing-faq-icon grid size-7 flex-none place-items-center text-[var(--wl-color-text-secondary)] ${open ? 'wl-landing-faq-icon--open' : ''}`}>
                      <Icon name="chevron-down" size="md" />
                    </span>
                  </button>
                  <div className={`wl-landing-faq-panel ${open ? 'wl-landing-faq-panel--open' : ''}`}>
                    <div style={{ minHeight: 0 }}>
                      <p className="m-0 max-w-[64ch] px-0.5 pb-5 text-[15px] leading-[1.72] text-[var(--wl-color-text-body)]">{row.answer}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </Reveal>
        </section>

        <section className="border-t border-[var(--wl-color-border)] bg-[var(--wl-brand-50)]">
          <Reveal className="mx-auto grid max-w-[720px] justify-items-center gap-5.5 px-6 py-22 text-center">
            <h2 className="m-0 font-extrabold leading-[1.26] tracking-[-0.03em]" style={{ fontSize: 'clamp(27px, 3.2vw, 36px)' }}>이번 기간부터 같이 기록해요</h2>
            <p className="m-0 max-w-[44ch] text-[16.5px] leading-[1.7] text-[var(--wl-color-text-body)]">
              카카오로 로그인하면 개인 가계부가 먼저 생기고, 링크 하나로 상대방을 공동 가계부에 초대할 수 있습니다.
            </p>
            {renderCta('lg', 'w-full sm:w-auto')}
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-[var(--wl-color-border)]">
        <div className="mx-auto flex max-w-[1160px] flex-col items-center justify-between gap-6 px-6 py-8 sm:flex-row">
          <img alt="우리로그" className="block h-auto w-28 opacity-75" src={logo} />
          <div className="flex items-center gap-5 text-[13.5px] text-[var(--wl-color-text-secondary)]">
            <a className="text-[var(--wl-color-text-secondary)]" href="#faq">자주 묻는 질문</a>
            <a className="text-[var(--wl-color-text-secondary)]" href="#privacy">보이는 범위</a>
            <span>문의 hello@woorilog.kr</span>
          </div>
        </div>
      </footer>

      {loginOpen ? <LoginModal onClose={() => setLoginOpen(false)} /> : null}
    </div>
  )
}
