import {
  Bell,
  CreditCard,
  Download,
  Heart,
  House,
  PieChart,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import landingBackground from '../assets/landing/landing-desk-bg.png'
import { getAccessToken } from '../shared/api/client'

const recentTransactions = [
  { category: '마트', name: '이마트', amount: '-87,450원', color: 'bg-amber-100 text-amber-700' },
  { category: '간식', name: '카페 그린', amount: '-6,200원', color: 'bg-rose-100 text-rose-700' },
  { category: '교통', name: '버스', amount: '-1,400원', color: 'bg-blue-100 text-blue-700' },
]

const features = [
  { icon: Users, title: '함께 관리', description: '실시간으로 수입과 지출을 함께 기록하고 확인해요.' },
  { icon: CreditCard, title: '예산 설정', description: '항목별 예산을 설정하고 지출을 계획적으로 관리해요.' },
  { icon: PieChart, title: '지출 분석', description: '카테고리별 통계로 소비 패턴을 한눈에 파악할 수 있어요.' },
  { icon: ShieldCheck, title: '안심 보안', description: '카드 등록 없이 안전하게 데이터를 보호해요.' },
]

function ProductPreview() {
  return (
    <div className="relative w-full max-w-[680px] px-2 sm:px-5 md:px-0" aria-hidden="true">
      <div className="flex aspect-[4/3] w-full overflow-hidden rounded-lg border border-[#e5ede8] bg-white/95 text-[9px] shadow-2xl shadow-emerald-950/10 backdrop-blur-sm md:text-[10px]">
        <aside className="flex w-[18%] flex-col gap-4 border-r border-[#e5ede8] bg-[#f8faf8] p-2">
          <div className="flex items-center gap-1.5 font-bold text-[#0e9f6e]">
            <House className="size-4" />
            <span className="hidden text-[9px] sm:inline">우리로그</span>
          </div>
          <div className="flex flex-col gap-1">
            {['홈', '내역', '예산', '통계', '자산', '멤버', '설정'].map((menu, index) => (
              <div className={`flex items-center gap-2 rounded-md px-2 py-1 font-bold ${index === 0 ? 'bg-[#e7f7ef] text-[#0e9f6e]' : 'text-[#6b7280]'}`} key={menu}>
                <span className={`size-1.5 rounded-full ${index === 0 ? 'bg-[#0e9f6e]' : 'bg-transparent'}`} />
                <span>{menu}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8faf8]">
          <div className="flex h-10 shrink-0 items-center justify-between border-b border-[#e5ede8] bg-white px-3">
            <strong>2026년 7월 <span className="text-[7px]">▼</span></strong>
            <div className="flex items-center gap-2"><Bell className="size-3.5 text-[#6b7280]" /><span className="flex size-5 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-600">우</span></div>
          </div>
          <div className="grid flex-1 content-start grid-cols-2 gap-2.5 overflow-hidden p-3">
            <div className="flex flex-col justify-between rounded-lg border border-[#e5ede8] bg-white p-2.5">
              <div><p className="font-semibold text-[#6b7280]">이번 달 예산</p><p className="mt-0.5 text-[13px] font-black text-[#111827]">3,200,000원</p><p className="mt-1 text-[7px] text-[#6b7280]">사용 1,650,000원 (51%)</p></div>
              <div><div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-[51%] rounded-full bg-[#0e9f6e]" /></div><p className="mt-2 font-bold text-[#0e9f6e]">예산 설정하기 ›</p></div>
            </div>
            <div className="flex flex-col justify-between rounded-lg border border-[#e5ede8] bg-white p-2.5">
              <div><p className="font-semibold text-[#6b7280]">이번 달 지출</p><p className="mt-0.5 text-[13px] font-black text-[#111827]">1,650,000원</p><p className="mt-1 text-[7px] text-[#6b7280]">지난달보다 120,000원 적게 사용했어요</p></div>
              <div className="mt-2 flex h-8 items-end justify-around gap-2 px-1">{[45, 72, 95, 58, 76].map((height, index) => <span className="w-2 rounded-t bg-emerald-200" key={height} style={{ height: `${height}%`, backgroundColor: index === 2 ? '#0e9f6e' : undefined }} />)}</div>
            </div>
            <div className="rounded-lg border border-[#e5ede8] bg-white p-2.5">
              <p className="mb-1.5 font-semibold text-[#6b7280]">지출 캘린더</p>
              <div className="grid grid-cols-7 gap-y-1 text-center text-[6px]">
                {['일', '월', '화', '수', '목', '금', '토'].map((day) => <strong className="text-[#6b7280]" key={day}>{day}</strong>)}
                {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => <span className={`mx-auto flex size-3.5 items-center justify-center rounded-full font-bold ${day === 15 ? 'bg-[#0e9f6e] text-white' : 'text-[#111827]'}`} key={day}>{day}</span>)}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div className="rounded-lg border border-[#e5ede8] bg-white p-2.5"><p className="mb-1 text-[#6b7280]">함께하는 멤버</p>{['우리집', '나', '파트너'].map((name, index) => <div className="mt-1 flex items-center justify-between" key={name}><span className="flex items-center gap-1.5 font-bold"><i className="flex size-3.5 items-center justify-center rounded-full bg-emerald-100 not-italic text-[#0e9f6e]">{name[0]}</i>{name}</span><span className="rounded bg-[#e7f7ef] px-1 text-[#0e9f6e]">{index === 0 ? '관리자' : '멤버'}</span></div>)}</div>
              <div className="rounded-lg border border-[#e5ede8] bg-white p-2"><p className="text-[#6b7280]">이번 달 한마디</p><p className="mt-0.5 flex items-center gap-1 font-bold">이번 달도 잘하고 있어요! <Heart className="size-2.5 fill-[#0e9f6e] text-[#0e9f6e]" /></p></div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-7 right-0 flex aspect-[9/18] w-[145px] flex-col overflow-hidden rounded-xl border-[5px] border-slate-900 bg-white text-[7px] shadow-2xl sm:-right-3 sm:w-[180px] md:-right-8 md:w-[210px] md:text-[8px]">
        <div className="flex h-5 items-center justify-between border-b border-gray-100 px-2.5 font-bold"><span>9:41</span><span>● ●</span></div>
        <div className="flex flex-1 flex-col gap-2 overflow-hidden bg-[#f8faf8] p-2">
          <div className="flex items-center justify-between font-bold"><span>2026년 7월 ▼</span><Bell className="size-3" /></div>
          <div className="rounded-lg border border-[#e5ede8] bg-white p-2 shadow-sm"><p className="text-[#6b7280]">이번 달 예산</p><p className="mt-0.5 text-[11px] font-black">3,200,000원</p><div className="mt-1.5 h-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full w-[51%] bg-[#0e9f6e]" /></div></div>
          <div className="rounded-lg border border-[#e5ede8] bg-white p-2 shadow-sm"><p className="mb-1 font-semibold text-[#6b7280]">최근 내역</p>{recentTransactions.map((transaction) => <div className="mt-1.5 flex items-center justify-between" key={transaction.name}><span className="flex items-center gap-1"><i className={`rounded px-1 py-0.5 font-bold not-italic ${transaction.color}`}>{transaction.category}</i><strong>{transaction.name}</strong></span><strong>{transaction.amount}</strong></div>)}</div>
          <div className="rounded-lg border border-[#e5ede8] bg-white p-2 shadow-sm"><p className="mb-1 font-semibold text-[#6b7280]">지출 분석</p><div className="flex items-end gap-1.5 pt-2">{[35, 68, 48, 90, 60, 75].map((height) => <span className="flex-1 rounded-t bg-emerald-200" key={height} style={{ height: `${height * 0.35}px` }} />)}</div></div>
        </div>
        <div className="relative flex h-7 items-center justify-around border-t border-[#e5ede8] bg-white text-[#6b7280]"><span>홈</span><span>내역</span><span className="absolute -top-2.5 flex size-6 items-center justify-center rounded-full border-2 border-white bg-[#0e9f6e] text-xs font-bold text-white">+</span><span className="w-4" /><span>예산</span><span>통계</span></div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const startPath = getAccessToken() ? '/dashboard' : '/login'

  return (
    <main className="min-h-dvh bg-[#f8faf8] text-[#111827] antialiased">
      <header className="sticky top-0 z-50 border-b border-[#e5ede8] bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link className="flex items-center gap-2" to="/"><House className="size-6 text-[#0e9f6e]" strokeWidth={2.5} /><strong className="text-lg tracking-tight">우리로그</strong></Link>
          <nav aria-label="랜딩 메뉴" className="hidden items-center gap-8 md:flex"><a className="text-sm font-medium text-[#6b7280] hover:text-[#0e9f6e]" href="#features">기능</a><a className="text-sm font-medium text-[#6b7280] hover:text-[#0e9f6e]" href="#features">요금제</a><a className="text-sm font-medium text-[#6b7280] hover:text-[#0e9f6e]" href="#features">블로그</a><a className="text-sm font-medium text-[#6b7280] hover:text-[#0e9f6e]" href="#support">고객센터</a></nav>
          <Link className="inline-flex h-9 items-center justify-center rounded-lg border border-[#e5ede8] bg-white px-4 text-sm font-medium shadow-sm hover:border-[#0e9f6e] hover:text-[#0e9f6e]" to={startPath}>{getAccessToken() ? '내 장부' : '로그인'}</Link>
        </div>
      </header>

      <section className="relative overflow-hidden px-6 pb-24 pt-12 md:pb-32 md:pt-20">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 hidden w-[82%] lg:block">
          <img alt="" className="h-full w-full object-cover object-right opacity-90" src={landingBackground} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#f8faf8] via-[#f8faf8]/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#f8faf8]/10 via-transparent to-[#f8faf8]/25" />
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-14 lg:grid-cols-12 lg:items-center xl:gap-10">
          <div className="flex flex-col items-start lg:col-span-5">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#d1ebd9] bg-[#e7f7ef] px-3.5 py-1.5 text-xs font-semibold text-[#0e9f6e]"><Users className="size-3.5" /><span>함께 관리하고, 더 잘 모이는 우리 집 가계부</span></div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-[54px] lg:leading-[1.15]">함께 쓰는<br />우리 집 <span className="text-[#0e9f6e]">가계부</span></h1>
            <p className="mt-6 text-[15px] leading-relaxed text-[#6b7280] sm:text-base">수입과 지출을 함께 관리하고,<br className="hidden sm:inline" /> 투명한 소비로 더 단단해지는 우리.</p>
            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><Link className="inline-flex h-12 items-center justify-center rounded-lg bg-[#0e9f6e] px-8 text-[15px] font-semibold text-white shadow-md transition hover:bg-[#057a55]" to={startPath}>{getAccessToken() ? '내 장부로 가기' : '무료로 시작하기'}</Link><a className="inline-flex h-12 items-center justify-center rounded-lg border border-[#e5ede8] bg-white px-8 text-[15px] font-semibold text-[#6b7280] shadow-sm transition hover:border-slate-300 hover:text-[#111827]" href="#features">둘러보기</a></div>
            <div className="mt-12 w-full rounded-lg border border-[#e5ede8] bg-white p-4 shadow-sm sm:max-w-md"><div className="grid grid-cols-3 divide-x divide-[#e5ede8] text-center"><div className="flex flex-col items-center gap-1.5"><Download className="size-4 text-[#0e9f6e]" /><strong className="text-[11px]">무료로 시작</strong></div><div className="flex flex-col items-center gap-1.5 px-1"><CreditCard className="size-4 text-[#0e9f6e]" /><strong className="text-[11px]">카드 등록 없이 사용</strong></div><div className="flex flex-col items-center gap-1.5"><Users className="size-4 text-[#0e9f6e]" /><strong className="text-[11px]">오늘부터 함께</strong></div></div></div>
          </div>

          <div className="relative mt-2 flex justify-center lg:col-span-7 lg:mt-0 lg:justify-end"><ProductPreview /></div>
        </div>
      </section>

      <section className="border-y border-[#e5ede8] bg-white px-6 py-16" id="features">
        <div className="mx-auto max-w-7xl"><div className="grid gap-12 lg:grid-cols-12 lg:items-center"><div className="lg:col-span-4"><p className="text-sm font-semibold text-[#0e9f6e]">우리집에 꼭 맞는 기능</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">함께 쓰니까<br />더 쉬워요</h2></div><div className="lg:col-span-8"><div className="rounded-lg border border-[#e5ede8] bg-[#f8faf8] p-6 shadow-sm"><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{features.map(({ icon: Icon, title, description }) => <article key={title}><span className="flex size-10 items-center justify-center rounded-lg border border-[#e5ede8] bg-white text-[#0e9f6e] shadow-sm"><Icon className="size-5" /></span><h3 className="mt-4 text-[15px] font-bold">{title}</h3><p className="mt-2 text-xs leading-relaxed text-[#6b7280]">{description}</p></article>)}</div></div></div></div></div>
      </section>

      <footer className="border-t border-[#e5ede8] bg-[#f8faf8] py-8 text-center text-xs text-[#6b7280]" id="support"><p>© {new Date().getFullYear()} 우리로그 (Woorilog). All rights reserved.</p></footer>
    </main>
  )
}
