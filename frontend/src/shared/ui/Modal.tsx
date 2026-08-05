import { useEffect, useId } from 'react'
import type { ReactNode } from 'react'
import { useIsMobileShell } from '../lib/useIsMobileShell'
import { Icon } from './Icon'
import { useBodyScrollLock } from './useBodyScrollLock'
import { useSheetDrag } from './useSheetDrag'

/**
 * 모달 셸 — 스크림 · 패널 · 제목 · 닫기 버튼. 내용은 children으로 넣습니다.
 * 예산 상세, 거래 상세, 확인 대화상자에 씁니다.
 *
 * 모바일에서는 화면 아래에서 올라오는 바텀시트가 되고 손잡이로 끌어 닫을 수 있습니다.
 * 애니메이션과 형태는 patterns/overlay.css · patterns/mobile-shell.css가 소유합니다.
 */
export interface ModalProps {
  /** false면 렌더하지 않습니다. */
  open?: boolean
  title?: string
  /** 제목 아래 보조 설명 (예: 기간). */
  subtitle?: string
  /** 패널 최대 폭. 숫자는 px로 해석되고 화면보다 좁게 제한됩니다. */
  width?: number | string
  /** 넘기면 우측 상단에 닫기 버튼이 생깁니다. */
  onClose?: () => void
  children?: ReactNode
}

export function Modal({ open = true, title, subtitle, width = 760, onClose, children }: ModalProps) {
  const titleId = useId()
  const isMobile = useIsMobileShell()
  const { panelRef, stateClass, gripProps } = useSheetDrag(isMobile ? onClose : undefined)
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open || !onClose) return undefined
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="wl-modal-scrim"
      role="dialog"
      aria-modal="true"
      /* 제목이 있으면 그것으로 이름을 잡습니다. 없으면 스크린리더가 이름 없는 대화상자로 읽습니다. */
      aria-labelledby={title ? titleId : undefined}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.()
      }}
    >
      <div
        className={`wl-modal-panel${stateClass}`}
        ref={panelRef as React.RefObject<HTMLDivElement>}
        style={{ width: typeof width === 'number' ? `min(${width}px, 100%)` : width }}
      >
        {isMobile && onClose ? <div aria-hidden="true" className="wl-sheet-grip" {...gripProps} /> : null}
        {title || onClose ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ minWidth: 0 }}>
              {title ? (
                <h2 id={titleId} style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-.025em' }}>
                  {title}
                </h2>
              ) : null}
              {subtitle ? (
                <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>{subtitle}</p>
              ) : null}
            </div>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label="닫기"
                className="wl-icon-button wl-icon-button--subtle"
                style={{ width: 40, height: 40, flex: 'none' }}
              >
                <Icon name="x" size="md" />
              </button>
            ) : null}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}
