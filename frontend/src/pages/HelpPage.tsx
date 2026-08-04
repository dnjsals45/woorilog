import { BookOpenCheck, Mail, ScanText, WalletCards } from 'lucide-react'
import { PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

const guides = [
  { icon: WalletCards, title: '가계부와 거래', description: '상단 가계부 선택기에서 가계부를 바꾸고, 중앙 + 버튼으로 지출과 수입을 기록합니다.' },
  { icon: BookOpenCheck, title: '예산 설정', description: '예산 화면에서 전체 예산을 정하고 공동 예산과 내 예산으로 나눕니다.' },
  { icon: ScanText, title: '거래 가져오기', description: '거래 추가에서 영수증 또는 문자 내역을 선택하면 저장할 거래 후보를 확인할 수 있습니다.' },
]

export function HelpPage() {
  return (
    <main className="product-page product-page--medium">
      <PageHeader eyebrow="HELP" title="도움말" description="우리로그의 주요 기능과 사용 흐름을 확인합니다." />
      <SurfaceCard className="mt-5">
        <ul className="divide-y divide-slate-100">
          {guides.map(({ icon: Icon, title, description }) => (
            <li className="flex gap-4 py-5 first:pt-0 last:pb-0" key={title}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--wl-color-primary-soft)] text-[var(--wl-color-primary-dark)]"><Icon size={21} /></span>
              <div><h2 className="text-base font-bold">{title}</h2><p className="mt-1 text-sm font-medium leading-6 text-slate-500">{description}</p></div>
            </li>
          ))}
        </ul>
      </SurfaceCard>
      <SurfaceCard className="mt-5"><div className="flex items-center gap-3"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[var(--wl-data-blue-soft)] text-[var(--wl-data-blue)]"><Mail size={20} /></span><div><h2 className="font-bold">문제가 계속되나요?</h2><p className="mt-1 text-sm text-slate-500">오류가 발생한 화면과 시각, 수행한 동작을 함께 기록해 주세요.</p></div></div></SurfaceCard>
    </main>
  )
}
