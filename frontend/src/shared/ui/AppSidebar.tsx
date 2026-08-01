import { Fragment, useState } from 'react'
import type { CSSProperties } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import woorilogLogo from '../../assets/logo/woorilog-logo.svg'

/* 데스크톱 좌측 사이드바. 폭 232px 고정, 화면 전체 높이에 sticky.
 * ledgers를 넘기면 장부 칩이 스위처(드롭다운)가 되고, 안 넘기면 정적 칩입니다. */
const NAV_BASE: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  minHeight: 44,
  padding: '0 10px',
  borderRadius: 12,
  fontSize: 14,
  fontWeight: 600,
  textDecoration: 'none',
  transition: 'background-color var(--motion-fast) var(--ease-product), color var(--motion-fast) var(--ease-product)',
}

export interface LedgerRef {
  name: string
  /** 칩에 들어가는 2글자 약칭 (예: '우리'). */
  initials?: string
  /** 멤버 요약 (예: '홍길동 · 홍길순'). */
  members?: string
  /** 드롭다운 항목의 보조 설명 (예: '공동 · 홍길동, 홍길순'). */
  meta?: string
  current?: boolean
}

export interface NavItem {
  id: string
  label: string
  /** Icon 컴포넌트의 이름. */
  icon: IconName
  /** 넘기면 <a>, 없으면 <button> + onNavigate. */
  href?: string
}

/**
 * 데스크톱 좌측 사이드바 — 로고 · 장부 칩 · 내비 · 설정 · 사용자.
 * 폭 232px 고정이며 화면 높이에 sticky합니다. 모든 제품 화면의 첫 요소입니다.
 */
export interface AppSidebarProps {
  logoSrc?: string
  ledger?: LedgerRef
  /** 넘기면 장부 칩이 드롭다운 스위처가 됩니다. 화면이 장부를 못 바꾸면 생략하세요. */
  ledgers?: LedgerRef[]
  onSelectLedger?: (ledger: LedgerRef) => void
  createLedgerHref?: string
  nav?: NavItem[]
  activeId?: string
  onNavigate?: (id: string) => void
  settingsHref?: string
  user?: { name: string; role?: string; initials?: string }
}

export function AppSidebar({
  logoSrc = woorilogLogo,
  ledger,
  ledgers,
  onSelectLedger,
  createLedgerHref,
  nav = [],
  activeId,
  onNavigate,
  settingsHref = '#',
  user,
}: AppSidebarProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<string | null>(null)
  const switcher = Array.isArray(ledgers) && ledgers.length > 0

  const chip = (
    <Fragment>
      <span
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 30,
          height: 30,
          flex: 'none',
          borderRadius: 9,
          background: 'var(--wl-brand-100)',
          color: 'var(--wl-color-primary-dark)',
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {ledger?.initials}
      </span>
      <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
        <strong style={{ display: 'block', fontSize: 13, fontWeight: 700 }}>{ledger?.name}</strong>
        <span style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--wl-color-text-secondary)' }}>
          {ledger?.members}
        </span>
      </span>
    </Fragment>
  )

  return (
    <aside
      style={{
        width: 232,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 16px',
        borderRight: '1px solid var(--wl-color-border)',
        background: 'var(--wl-color-surface)',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      <img
        src={logoSrc}
        alt="우리로그"
        style={{ display: 'block', width: 'calc(100% - 12px)', height: 'auto', margin: '0 6px' }}
      />

      {ledger ? (
        <div style={{ position: 'relative', marginTop: 18 }}>
          {switcher ? (
            <button
              type="button"
              onClick={() => setOpen(!open)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: 10,
                border: '1px solid',
                borderColor: open ? 'var(--wl-color-primary)' : 'var(--wl-color-border)',
                borderRadius: 'var(--wl-radius-md)',
                background: 'var(--wl-color-surface)',
              }}
            >
              {chip}
              <span
                style={{
                  display: 'grid',
                  placeItems: 'center',
                  flex: 'none',
                  color: 'var(--wl-color-text-secondary)',
                  transition: 'transform 180ms var(--ease-out-strong)',
                  transform: open ? 'rotate(90deg)' : 'none',
                }}
              >
                <Icon name="chevron-right" size="sm" />
              </span>
            </button>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: 10,
                border: '1px solid var(--wl-color-border)',
                borderRadius: 'var(--wl-radius-md)',
                background: 'var(--wl-color-surface)',
              }}
            >
              {chip}
            </div>
          )}

          {switcher && open ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 'calc(100% + 6px)',
                zIndex: 20,
                padding: 6,
                border: '1px solid var(--wl-color-border)',
                borderRadius: 'var(--wl-radius-md)',
                background: 'var(--wl-color-surface)',
                boxShadow: 'var(--wl-shadow-overlay, var(--wl-shadow-modal))',
              }}
            >
              <ul style={{ display: 'grid', gap: 2, margin: 0, padding: 0, listStyle: 'none' }}>
                {ledgers.map((lg) => (
                  <li key={lg.name}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        if (onSelectLedger) onSelectLedger(lg)
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        minHeight: 44,
                        padding: '0 10px',
                        borderRadius: 10,
                        background: lg.current ? 'var(--wl-brand-50)' : 'transparent',
                        color: lg.current ? 'var(--wl-color-primary-dark)' : 'var(--wl-color-text-body)',
                      }}
                    >
                      <span style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                        <strong
                          style={{
                            display: 'block',
                            fontSize: 12.5,
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {lg.name}
                        </strong>
                        <span
                          style={{ display: 'block', marginTop: 2, fontSize: 11, color: 'var(--wl-color-text-secondary)' }}
                        >
                          {lg.meta}
                        </span>
                      </span>
                      {lg.current ? <Icon name="check" size="sm" /> : null}
                    </button>
                  </li>
                ))}
              </ul>
              {createLedgerHref ? (
                <a
                  href={createLedgerHref}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    minHeight: 40,
                    marginTop: 4,
                    padding: '0 10px',
                    borderTop: '1px solid var(--wl-color-border)',
                    borderRadius: 10,
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  <Icon name="plus" size="sm" />새 공동 장부 만들기
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 22 }}>
        {nav.map((item) => {
          const active = item.id === activeId
          const tone: CSSProperties = active
            ? { background: 'var(--wl-brand-100)', color: 'var(--wl-color-primary-dark)' }
            : item.id === hovered
              ? { background: 'var(--wl-color-surface-subtle)', color: 'var(--wl-color-text-main)' }
              : { background: 'transparent', color: 'var(--wl-color-text-body)' }
          const shared = {
            style: { ...NAV_BASE, ...tone },
            onMouseEnter: () => setHovered(item.id),
            onMouseLeave: () => setHovered(null),
          }
          const body = (
            <Fragment>
              <Icon name={item.icon} size="lg" />
              {item.label}
            </Fragment>
          )
          return item.href ? (
            <a key={item.id} href={item.href} {...shared}>
              {body}
            </a>
          ) : (
            <button key={item.id} type="button" onClick={() => onNavigate && onNavigate(item.id)} {...shared}>
              {body}
            </button>
          )
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 24 }}>
        <a href={settingsHref} style={{ ...NAV_BASE, color: 'var(--wl-color-text-secondary)' }}>
          <Icon name="settings" size="lg" />설정
        </a>
        {user ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 12,
              paddingTop: 16,
              borderTop: '1px solid var(--wl-color-border)',
            }}
          >
            <span
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 32,
                height: 32,
                flex: 'none',
                borderRadius: '50%',
                background: 'var(--wl-data-blue-soft)',
                color: 'var(--wl-data-blue-ink)',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {user.initials}
            </span>
            <span style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 13, fontWeight: 600 }}>{user.name}</strong>
              <span style={{ display: 'block', fontSize: 11, color: 'var(--wl-color-text-secondary)' }}>
                {user.role}
              </span>
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  )
}
