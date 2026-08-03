import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { useBodyScrollLock } from './useBodyScrollLock'
import { useSheetDrag } from './useSheetDrag'

/* 퇴장은 등장(300ms)보다 빠릅니다. 사용자가 이미 닫기로 결정한 뒤라 기다릴 이유가 없습니다.
 * patterns/mobile-shell.css 의 .wl-sheet--closing 과 같은 값이어야 합니다. */
const EXIT_MS = 200

export interface SheetProps {
  open?: boolean
  title?: string
  /** 제목 아래 한 줄 설명. */
  subtitle?: string
  /** true면 화면 대부분을 채웁니다. 폼처럼 내용이 긴 시트에 씁니다. */
  tall?: boolean
  /** 시트 하단에 고정되는 액션 영역 (주 버튼 등). */
  footer?: ReactNode
  onClose?: () => void
  children?: ReactNode
}

/**
 * 모바일 바텀시트 — 모달·드로어·팝오버가 모바일에서 수렴하는 하나의 형태입니다.
 *
 * 손잡이를 잡아 아래로 끌면 닫히고, 조금만 끌면 제자리로 돌아옵니다(useSheetDrag).
 * 모양과 키프레임은 patterns/mobile-shell.css 가 소유합니다.
 */
export function Sheet({ open = true, title, subtitle, tall, footer, onClose, children }: SheetProps) {
  const [closing, setClosing] = useState(false)
  const exitTimerRef = useRef<number | undefined>(undefined)

  /* 스크림·닫기 버튼·Escape 로 닫을 때는 내려가는 모습을 보여주고 나서 부모에게 알립니다.
   * 손으로 끌어 닫을 때는 이 경로를 타지 않습니다 — 손가락이 이미 옮겨 놓은 자리에서
   * 다시 아래로 튀면 어색해서, 그때는 바로 닫습니다. */
  const requestClose = useCallback(() => {
    if (!onClose || closing) return
    setClosing(true)
    exitTimerRef.current = window.setTimeout(onClose, EXIT_MS)
  }, [closing, onClose])

  useEffect(() => () => window.clearTimeout(exitTimerRef.current), [])

  const { panelRef, stateClass, gripProps } = useSheetDrag(onClose)
  useBodyScrollLock(open)

  useEffect(() => {
    if (!open || !onClose) return undefined
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') requestClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose, requestClose])

  /* 시트가 열리면 포커스를 안으로 옮깁니다. 그러지 않으면 탭 이동이 뒤 화면을 훑습니다. */
  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const focusable = panel.querySelector<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )
    ;(focusable ?? panel).focus({ preventScroll: true })
  }, [open, panelRef])

  if (!open) return null

  const labelId = title ? 'wl-sheet-title' : undefined
  return (
    <>
      <div
        className={`wl-sheet-scrim${closing ? ' wl-sheet-scrim--closing' : ''}`}
        onClick={requestClose}
        role="presentation"
      />
      <div
        aria-labelledby={labelId}
        aria-modal="true"
        className={`wl-sheet${tall ? ' wl-sheet--tall' : ''}${closing ? ' wl-sheet--closing' : ''}${stateClass}`}
        ref={panelRef as React.RefObject<HTMLDivElement>}
        role="dialog"
        tabIndex={-1}
      >
        {onClose ? <div aria-hidden="true" className="wl-sheet-grip" {...gripProps} /> : null}
        {title || onClose ? (
          <div className="wl-sheet-header">
            <div style={{ minWidth: 0 }}>
              {title ? <h2 id={labelId}>{title}</h2> : null}
              {subtitle ? (
                <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>{subtitle}</p>
              ) : null}
            </div>
            {onClose ? (
              <button
                aria-label="닫기"
                className="wl-icon-button wl-icon-button--subtle"
                onClick={requestClose}
                style={{ flex: 'none', height: 40, width: 40 }}
                type="button"
              >
                <Icon name="x" size="md" />
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="wl-sheet-body">{children}</div>
        {footer ? <div className="wl-sheet-footer">{footer}</div> : null}
      </div>
    </>
  )
}
