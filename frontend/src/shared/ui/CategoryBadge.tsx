import { Icon } from './Icon'
import type { IconName } from './Icon'

export interface CategoryMark {
  icon: IconName
  background: string
  color: string
}

/* 기본 카테고리(대분류)의 그룹 코드 → 마크. 이름이 바뀌어도 흔들리지 않게 코드로 잡습니다.
 * 사용자가 직접 만든 그룹은 코드가 없으므로 아래 이름 기반 MARKS 로 넘어갑니다.
 * (LedgerCategorySeedingService.defaultGroups 와 짝을 이룹니다.) */
const GROUP_MARKS = {
  FOOD: { icon: 'utensils', background: 'var(--wl-data-coral-soft)', color: 'var(--wl-data-coral-ink)' },
  HOUSING: { icon: 'house', background: 'var(--wl-brand-100)', color: 'var(--wl-brand-700)' },
  TRANSPORT: { icon: 'bus-front', background: 'var(--wl-data-blue-soft)', color: 'var(--wl-data-blue-ink)' },
  SHOPPING: { icon: 'shirt', background: 'var(--wl-data-amber-soft)', color: 'var(--wl-data-amber-ink)' },
  HEALTH: { icon: 'stethoscope', background: 'var(--wl-data-coral-soft)', color: 'var(--wl-data-coral-ink)' },
  LEISURE: { icon: 'ticket', background: 'var(--wl-data-violet-soft)', color: 'var(--wl-data-violet-ink)' },
  EDUCATION: { icon: 'graduation-cap', background: 'var(--wl-brand-100)', color: 'var(--wl-brand-700)' },
  FINANCE: { icon: 'landmark', background: 'var(--wl-data-blue-soft)', color: 'var(--wl-data-blue-ink)' },
  RELATIONSHIPS: { icon: 'gift', background: 'var(--wl-data-coral-soft)', color: 'var(--wl-data-coral-ink)' },
  PETS: { icon: 'paw-print', background: 'var(--wl-data-amber-soft)', color: 'var(--wl-data-amber-ink)' },
  OTHER_EXPENSE: { icon: 'ellipsis', background: 'var(--wl-data-neutral-soft)', color: 'var(--wl-data-neutral-ink)' },
  EARNED_INCOME: { icon: 'circle-dollar-sign', background: 'var(--wl-data-blue-soft)', color: 'var(--wl-data-blue-ink)' },
  OTHER_INCOME: { icon: 'wallet', background: 'var(--wl-data-violet-soft)', color: 'var(--wl-data-violet-ink)' },
  TRANSFER: { icon: 'arrow-left-right', background: 'var(--wl-data-neutral-soft)', color: 'var(--wl-data-neutral-ink)' },
} as const satisfies Record<string, CategoryMark>

const MARKS = {
  식비: { icon: 'utensils', background: 'var(--wl-data-coral-soft)', color: 'var(--wl-data-coral-ink)' },
  카페: { icon: 'coffee', background: 'var(--wl-data-amber-soft)', color: 'var(--wl-data-amber-ink)' },
  교통: { icon: 'bus-front', background: 'var(--wl-data-blue-soft)', color: 'var(--wl-data-blue-ink)' },
  장보기: { icon: 'shopping-basket', background: 'var(--wl-data-violet-soft)', color: 'var(--wl-data-violet-ink)' },
  주거: { icon: 'house', background: 'var(--wl-brand-100)', color: 'var(--wl-brand-700)' },
  통신: { icon: 'smartphone', background: 'var(--wl-data-blue-soft)', color: 'var(--wl-data-blue-ink)' },
  의료: { icon: 'stethoscope', background: 'var(--wl-data-coral-soft)', color: 'var(--wl-data-coral-ink)' },
  문화: { icon: 'ticket', background: 'var(--wl-data-violet-soft)', color: 'var(--wl-data-violet-ink)' },
  의류: { icon: 'shirt', background: 'var(--wl-data-amber-soft)', color: 'var(--wl-data-amber-ink)' },
  여행: { icon: 'plane', background: 'var(--wl-data-blue-soft)', color: 'var(--wl-data-blue-ink)' },
  교육: { icon: 'graduation-cap', background: 'var(--wl-brand-100)', color: 'var(--wl-brand-700)' },
  경조사: { icon: 'gift', background: 'var(--wl-data-coral-soft)', color: 'var(--wl-data-coral-ink)' },
  수입: { icon: 'circle-dollar-sign', background: 'var(--wl-data-blue-soft)', color: 'var(--wl-data-blue-ink)' },
  기타: { icon: 'ellipsis', background: 'var(--wl-data-neutral-soft)', color: 'var(--wl-data-neutral-ink)' },
} as const satisfies Record<string, CategoryMark>

type MarkKey = keyof typeof MARKS

const ALIASES: Record<string, MarkKey> = {
  '카페·간식': '카페',
  외식: '식비',
  배달: '식비',
  '주거·생활': '주거',
  '월세·관리비': '주거',
  공과금: '주거',
  생활용품: '주거',
  '교통·차량': '교통',
  대중교통: '교통',
  택시: '교통',
  주유: '교통',
  '주차·통행': '교통',
  차량관리: '교통',
  '쇼핑·미용': '의류',
  미용: '의류',
  '기타 쇼핑': '의류',
  건강: '의료',
  병원: '의료',
  약국: '의료',
  운동: '의료',
  여가: '문화',
  취미: '문화',
  모임: '문화',
  도서: '교육',
  '강의·학원': '교육',
  관계: '경조사',
  선물: '경조사',
  근로소득: '수입',
  기타수입: '수입',
  급여: '수입',
  상여: '수입',
  용돈: '수입',
  금융수입: '수입',
  중고거래: '수입',
  '기타 수입': '수입',
}

/* 디자인 시스템 계약은 name: string 이지만, 이 저장소의 기존 호출부가 null 을 넘길 수 있어
 * 입력을 넓혀 받습니다. 빈 값은 원본과 동일하게 '기타'로 접힙니다. */
// eslint-disable-next-line react-refresh/only-export-components -- 디자인 시스템 CategoryBadge.d.ts 계약에 포함된 export
export function categoryMarkFor(name?: string | null): CategoryMark {
  const category = name?.trim()
  if (!category) return MARKS['기타']
  return MARKS[category as MarkKey] || MARKS[ALIASES[category] || '기타']
}

/** 그룹 코드가 있으면 그것으로, 없으면 이름으로 마크를 고릅니다. */
// eslint-disable-next-line react-refresh/only-export-components
export function categoryMarkForGroup(code?: string | null, name?: string | null): CategoryMark {
  const key = code?.trim() as keyof typeof GROUP_MARKS | undefined
  return (key && GROUP_MARKS[key]) || categoryMarkFor(name)
}

/** 거래 카테고리를 색+글리프 원형 마크로 표시합니다. 카테고리 이름은 한국어 원문 그대로 넘깁니다. */
export interface CategoryBadgeProps {
  /** '식비', '카페·간식' 처럼 제품에서 쓰는 이름. 별칭은 내부에서 대표 카테고리로 접힙니다. */
  name?: string | null
  /** sm=28px(리스트 밀집) · md=34px(기본) */
  size?: 'sm' | 'md'
}

export function CategoryBadge({ name, size = 'md' }: CategoryBadgeProps) {
  const mark = categoryMarkFor(name)
  const small = size === 'sm'
  return (
    <span
      aria-hidden="true"
      className="wl-category-mark flex shrink-0 items-center justify-center rounded-full border"
      style={{ width: small ? 28 : 34, height: small ? 28 : 34, background: mark.background, color: mark.color }}
    >
      <Icon name={mark.icon} size={small ? 'sm' : 'md'} />
    </span>
  )
}
