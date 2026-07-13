import { BookOpenCheck, Mail, ScanText, WalletCards } from 'lucide-react'
import { PageHeader, SurfaceCard } from '../shared/ui/DesignPrimitives'

const guides = [
  { icon: WalletCards, title: '장부와 거래', description: '상단 장부 선택기에서 장부를 바꾸고, 중앙 + 버튼으로 지출과 수입을 기록합니다.' },
  { icon: BookOpenCheck, title: '예산과 월 마감', description: '예산·정산 화면에서 월 예산을 설정합니다. 마감된 월은 다시 열기 전까지 변경할 수 없습니다.' },
  { icon: ScanText, title: '거래 가져오기', description: '가계부의 스캔 버튼에서 영수증 이미지나 텍스트를 거래 후보로 변환할 수 있습니다.' },
]

export function HelpPage() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1000px] px-4 py-4 sm:px-6 md:p-8 lg:p-10">
      <PageHeader eyebrow="HELP" title="도움말" description="우리로그의 주요 기능과 사용 흐름을 확인합니다." />
      <section className="mt-5 grid gap-5 md:grid-cols-3">
        {guides.map(({ icon: Icon, title, description }) => <SurfaceCard key={title}><Icon className="text-emerald-600" size={24} /><h2 className="mt-4 text-lg font-extrabold">{title}</h2><p className="mt-2 text-sm font-medium leading-6 text-slate-500">{description}</p></SurfaceCard>)}
      </section>
      <SurfaceCard className="mt-5"><div className="flex items-center gap-3"><Mail className="text-emerald-600" size={22} /><div><h2 className="font-extrabold">문제가 계속되나요?</h2><p className="mt-1 text-sm text-slate-500">오류가 발생한 화면과 시각, 수행한 동작을 함께 기록해 주세요.</p></div></div></SurfaceCard>
    </main>
  )
}
