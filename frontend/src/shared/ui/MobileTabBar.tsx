import { Icon } from './Icon'
import type { IconName } from './Icon'

export interface MobileTab {
  id: string
  label: string
  icon: IconName
  /** 진짜 링크로 그려서 새 탭 열기와 스크린리더 안내를 유지합니다. 이동은 onSelect가 가로챕니다. */
  href?: string
}

export interface MobileTabBarProps {
  tabs: MobileTab[]
  activeId?: string
  onSelect?: (id: string) => void
  label?: string
}

/**
 * 모바일 바텀 탭바 — 데스크톱 사이드바를 대신하는 주 내비게이션.
 * 5칸 고정이며, 마지막 칸은 보통 "더보기" 시트를 엽니다.
 * 치수·색은 patterns/mobile-shell.css 가 소유합니다.
 */
export function MobileTabBar({ tabs, activeId, onSelect, label = '주요 메뉴' }: MobileTabBarProps) {
  return (
    <nav aria-label={label} className="wl-tabbar">
      {tabs.map((tab) => {
        const active = tab.id === activeId
        const body = (
          <>
            <span className="wl-tabbar-icon">
              <Icon name={tab.icon} size="lg" />
            </span>
            {tab.label}
          </>
        )
        return tab.href ? (
          <a
            aria-current={active ? 'page' : undefined}
            className="wl-tabbar-item"
            href={tab.href}
            key={tab.id}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
              event.preventDefault()
              onSelect?.(tab.id)
            }}
          >
            {body}
          </a>
        ) : (
          <button
            aria-current={active ? 'page' : undefined}
            className="wl-tabbar-item"
            key={tab.id}
            onClick={() => onSelect?.(tab.id)}
            type="button"
          >
            {body}
          </button>
        )
      })}
    </nav>
  )
}
