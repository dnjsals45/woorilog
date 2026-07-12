import { BusFront, CircleDollarSign, Coffee, ShoppingBasket, Utensils } from 'lucide-react'

export function CategoryBadge({ name, size = 'md' }: { name?: string | null; size?: 'sm' | 'md' }) {
  const category = name?.trim() || '기타'
  const normalized = category.toLowerCase()
  const config = normalized.includes('카페') || normalized.includes('커피')
    ? { Icon: Coffee, style: 'border-amber-100 bg-amber-50 text-amber-600' }
    : normalized.includes('식')
      ? { Icon: Utensils, style: 'border-orange-100 bg-orange-50 text-orange-600' }
      : normalized.includes('마트') || normalized.includes('쇼핑') || normalized.includes('생활')
        ? { Icon: ShoppingBasket, style: 'border-pink-100 bg-pink-50 text-pink-600' }
        : normalized.includes('교통')
          ? { Icon: BusFront, style: 'border-blue-100 bg-blue-50 text-blue-600' }
          : { Icon: CircleDollarSign, style: 'border-emerald-100 bg-emerald-50 text-emerald-600' }
  const { Icon, style } = config

  return <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-full border ${style} ${size === 'sm' ? 'size-8' : 'size-10'}`}><Icon size={size === 'sm' ? 15 : 18} strokeWidth={2.1} /></span>
}
