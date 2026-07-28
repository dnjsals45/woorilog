import { BusFront, CircleDollarSign, Coffee, ShoppingBasket, Utensils } from 'lucide-react'

export function CategoryBadge({ name, size = 'md' }: { name?: string | null; size?: 'sm' | 'md' }) {
  const category = name?.trim() || '기타'
  const normalized = category.toLowerCase()
  const config = normalized.includes('카페') || normalized.includes('커피')
    ? { Icon: Coffee, style: 'wl-category-mark--amber' }
    : normalized.includes('식')
      ? { Icon: Utensils, style: 'wl-category-mark--coral' }
      : normalized.includes('마트') || normalized.includes('쇼핑') || normalized.includes('생활')
        ? { Icon: ShoppingBasket, style: 'wl-category-mark--violet' }
        : normalized.includes('교통')
          ? { Icon: BusFront, style: 'wl-category-mark--blue' }
          : { Icon: CircleDollarSign, style: 'wl-category-mark--brand' }
  const { Icon, style } = config

  return <span aria-hidden="true" className={`wl-category-mark flex shrink-0 items-center justify-center rounded-full border ${style} ${size === 'sm' ? 'size-8' : 'size-10'}`}><Icon size={size === 'sm' ? 15 : 18} strokeWidth={2.1} /></span>
}
