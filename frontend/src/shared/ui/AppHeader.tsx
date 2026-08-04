import type { ReactNode } from 'react'
import { useIsMobileShell } from '../lib/useIsMobileShell'
import { Icon } from './Icon'

export interface HeaderStepper {
  /** 가운데 표시되는 라벨 (예: '2026년 8월'). */
  label: string
  onPrev?: () => void
  onNext?: () => void
  disablePrev?: boolean
  disableNext?: boolean
  prevLabel?: string
  nextLabel?: string
}

/**
 * 제품 화면 상단 헤더 — 제목 · 설명 · 기간 · 월 이동 · 액션.
 *
 * 데스크톱: 높이 72px 고정 한 줄, 본문 스크롤 위에 sticky.
 * 모바일: 제목 줄(56px)과 기간 이동 줄로 나뉘고, 설명·기간 메타는 접습니다 —
 * 좁은 화면에서 한 줄에 다 넣으면 제목이 먼저 잘립니다.
 * 페이지의 h1은 여기 title입니다.
 */
export interface AppHeaderProps {
  title: string
  /** 한 줄 설명. meta와 함께 넘기면 사이에 세로 구분선이 들어갑니다. 모바일에서는 숨깁니다. */
  description?: string
  /** 현재 예산 기간 등 보조 정보 (예: '26년 07월 10일 ~ 26년 08월 09일'). */
  meta?: string
  /** 월·기간 이동 컨트롤. 필요 없는 화면에서는 생략하세요. */
  stepper?: HeaderStepper
  /** 아이콘 버튼과 주요 CTA. 오른쪽 끝에 순서대로 놓입니다. */
  actions?: ReactNode
  /**
   * 모바일에서 actions 대신 놓을 것. 넘기지 않으면 actions 를 그대로 씁니다.
   * "거래 추가"처럼 모바일에서 FAB 이 대신하는 버튼을 걷어낼 때 씁니다.
   */
  mobileActions?: ReactNode
  /** 제목을 버튼으로 만들어 가계부 전환 같은 시트를 엽니다. 모바일에서만 동작합니다. */
  onTitleClick?: () => void
}

export function AppHeader({ title, description, meta, stepper, actions, mobileActions, onTitleClick }: AppHeaderProps) {
  const isMobile = useIsMobileShell()

  if (isMobile) {
    const titleBody = (
      <>
        <span>{title}</span>
        {onTitleClick ? <Icon name="chevron-down" size="sm" /> : null}
      </>
    )
    return (
      <header className="wl-mobile-header">
        <div className="wl-mobile-header-row">
          {onTitleClick ? (
            <button className="wl-mobile-header-title" onClick={onTitleClick} type="button">
              {titleBody}
            </button>
          ) : (
            <h1 className="wl-mobile-header-title">{titleBody}</h1>
          )}
          <div className="wl-mobile-header-actions">{mobileActions ?? actions}</div>
        </div>
        {stepper ? (
          <div className="wl-mobile-header-stepper">
            <button
              aria-label={stepper.prevLabel || '이전'}
              disabled={stepper.disablePrev}
              onClick={stepper.onPrev}
              style={{ opacity: stepper.disablePrev ? 0.35 : 1 }}
              type="button"
            >
              <Icon name="chevron-left" size="md" />
            </button>
            <strong>{stepper.label}</strong>
            <button
              aria-label={stepper.nextLabel || '다음'}
              disabled={stepper.disableNext}
              onClick={stepper.onNext}
              style={{ opacity: stepper.disableNext ? 0.35 : 1 }}
              type="button"
            >
              <Icon name="chevron-right" size="md" />
            </button>
          </div>
        ) : null}
      </header>
    )
  }

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
        height: 72,
        padding: '0 36px',
        borderBottom: '1px solid var(--wl-color-border)',
        background: 'var(--wl-color-surface)',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '-.02em' }}>{title}</h1>
        {description || meta ? (
          <p
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              margin: '3px 0 0',
              fontSize: 12,
              color: 'var(--wl-color-text-secondary)',
            }}
          >
            {description}
            {description && meta ? (
              <span style={{ width: 1, height: 11, background: 'var(--wl-color-border)' }} />
            ) : null}
            {meta}
          </p>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 'none' }}>
        {stepper ? (
          <div className="dashboard-month-picker" style={{ height: 40 }}>
            <button
              type="button"
              aria-label={stepper.prevLabel || '이전'}
              onClick={stepper.onPrev}
              disabled={stepper.disablePrev}
              style={{
                width: 40,
                height: 40,
                opacity: stepper.disablePrev ? 0.35 : 1,
                cursor: stepper.disablePrev ? 'default' : 'pointer',
              }}
            >
              <Icon name="chevron-left" size="md" />
            </button>
            <strong>{stepper.label}</strong>
            <button
              type="button"
              aria-label={stepper.nextLabel || '다음'}
              onClick={stepper.onNext}
              disabled={stepper.disableNext}
              style={{
                width: 40,
                height: 40,
                opacity: stepper.disableNext ? 0.35 : 1,
                cursor: stepper.disableNext ? 'default' : 'pointer',
              }}
            >
              <Icon name="chevron-right" size="md" />
            </button>
          </div>
        ) : null}
        {actions}
      </div>
    </header>
  )
}
