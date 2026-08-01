import type { ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * 모달 셸 — 스크림 · 패널 · 제목 · 닫기 버튼. 내용은 children으로 넣습니다.
 * 예산 상세, 거래 상세, 확인 대화상자에 씁니다.
 * 애니메이션은 patterns/overlay.css가 소유합니다.
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
  if (!open) return null
  return (
    <div className="wl-modal-scrim" role="dialog" aria-modal="true">
      <div className="wl-modal-panel" style={{ width: typeof width === 'number' ? `min(${width}px, 100%)` : width }}>
        {title || onClose ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20 }}>
            <div style={{ minWidth: 0 }}>
              {title ? (
                <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-.025em' }}>{title}</h2>
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
