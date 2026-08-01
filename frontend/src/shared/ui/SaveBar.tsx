import type { CSSProperties, ReactNode } from 'react'

/**
 * 미저장 변경이 있을 때만 하단에서 올라오는 저장 바 (예산 설정 · 반복 거래 · 설정).
 * 변경이 없으면 아무것도 렌더하지 않습니다 — 항상 보이는 바가 아닙니다.
 * 사이드바 폭(232px)만큼 왼쪽을 비웁니다 — offset으로 조절합니다.
 */
export interface SaveBarProps {
  /** 미저장 변경 여부. false면 렌더하지 않습니다. */
  open?: boolean
  title?: string
  /** 저장하면 무슨 일이 일어나는지 한 줄로 (예: '예비비는 120,000원으로 저장돼요'). */
  note?: string
  /** 왼쪽 여백. 기본값은 사이드바 폭 232px입니다. */
  offset?: number | string
  /** 되돌리기·저장 버튼과 적용 범위 칩. */
  children?: ReactNode
}

export function SaveBar({ open = true, title = '저장하지 않은 변경이 있어요', note, offset, children }: SaveBarProps) {
  if (!open) return null
  return (
    <div
      className="wl-save-bar"
      style={
        offset === undefined
          ? undefined
          : ({ '--wl-save-bar-offset': typeof offset === 'number' ? offset + 'px' : offset } as CSSProperties)
      }
    >
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 13.5, fontWeight: 700 }}>{title}</strong>
        {note ? (
          <span style={{ display: 'block', marginTop: 3, fontSize: 12.5, color: 'var(--wl-color-text-secondary)' }}>
            {note}
          </span>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 'none' }}>{children}</div>
    </div>
  )
}
