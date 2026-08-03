import type { CSSProperties } from 'react'

/* 카테고리 지출 도넛 + 범례. 조각과 범례가 같은 선택 상태를 공유합니다.
 * 조각 스타일은 patterns/dashboard.css의 .dashboard-donut-* 가 소유합니다. */
const R = 53
const C = 2 * Math.PI * R

export interface DonutSegment {
  name: string
  /** 이미 포맷된 금액 (예: '268,400원'). */
  amount: string
  /** 정수 퍼센트. 합이 100이 되도록 넘기세요. */
  percent: number
  /** 조각 색. 데이터 색 토큰을 씁니다 (예: 'var(--wl-data-coral)'). */
  color: string
}

/**
 * 카테고리 지출 도넛 + 범례. 조각과 범례가 같은 선택 상태를 공유하고,
 * 하나를 고르면 그 조각만 살아나고 나머지는 흐려집니다.
 */
export interface DonutChartProps {
  segments?: DonutSegment[]
  /** 선택된 카테고리 이름. null이면 전체 보기입니다. */
  selected?: string | null
  /** 같은 항목을 다시 누르면 null이 전달됩니다. */
  onSelect?: (name: string | null) => void
  /** 도넛 지름. 기본 112px. */
  size?: number
  /** 선택이 없을 때 가운데 글자. */
  centerLabel?: string
  /** 범례를 숨기고 도넛만 그립니다. */
  legend?: boolean
}

export function DonutChart({
  segments = [],
  selected,
  onSelect,
  size = 112,
  centerLabel = '전체',
  legend = true,
}: DonutChartProps) {
  const active = segments.find((s) => s.name === selected)
  const pick = (name: string) => {
    if (onSelect) onSelect(name === selected ? null : name)
  }

  /* 원본은 map 안에서 offset 변수를 누적하는데, 렌더 도중 변수를 변형하는 방식이라
   * 재렌더 시 조각 위치가 어긋납니다. 누적을 렌더 전에 끝내 같은 결과를 안전하게 만듭니다. */
  const arcs = segments.map((seg, index) => ({
    seg,
    len: (seg.percent / 100) * C,
    start: segments.slice(0, index).reduce((sum, prev) => sum + (prev.percent / 100) * C, 0),
  }))

  return (
    <div
      className={legend ? 'wl-donut wl-donut--with-legend' : 'wl-donut'}
      style={legend ? ({ '--wl-donut-size': `${size}px` } as CSSProperties) : undefined}
    >
      <div className="dashboard-donut" style={{ width: size, height: size }}>
        <svg className="dashboard-donut-svg" viewBox="0 0 124 124">
          <circle className="dashboard-donut-track" cx="62" cy="62" r={R} />
          {arcs.map(({ seg, len, start }) => {
            const dash = `${len.toFixed(1)} ${(C - len).toFixed(1)}`
            const dashOffset = -Number(start.toFixed(1))
            const cls =
              'dashboard-donut-segment' + (seg.name === selected ? ' is-active' : selected ? ' is-muted' : '')
            return (
              <circle
                key={seg.name}
                className={cls}
                cx="62"
                cy="62"
                r={R}
                strokeDasharray={dash}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 62 62)"
                style={{ '--segment-color': seg.color } as CSSProperties}
                onClick={() => pick(seg.name)}
              />
            )
          })}
        </svg>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 76, textAlign: 'center', overflow: 'hidden' }}>
          <strong style={{ fontSize: 16 }}>{active ? active.name : centerLabel}</strong>
        </div>
      </div>

      {legend ? (
        <ul style={{ display: 'grid', gap: 2, margin: 0, padding: 0, listStyle: 'none' }}>
          {segments.map((seg) => {
            const on = seg.name === selected
            const dim = selected && !on
            return (
              <li key={seg.name}>
                <button
                  type="button"
                  onClick={() => pick(seg.name)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '8px minmax(0,1fr) auto',
                    alignItems: 'center',
                    gap: 9,
                    width: '100%',
                    minHeight: 38,
                    padding: '2px 6px',
                    marginInline: -6,
                    borderRadius: 8,
                    textAlign: 'left',
                    background: on ? 'var(--wl-color-surface-subtle)' : 'transparent',
                    opacity: dim ? 0.5 : 1,
                    transition:
                      'background-color var(--motion-fast) var(--ease-product), opacity var(--motion-fast) var(--ease-product)',
                  }}
                >
                  <i style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color }} />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: on ? 15 : 13.5,
                      fontWeight: on ? 800 : 500,
                      color: on ? 'var(--wl-color-text-main)' : 'var(--wl-color-text-body)',
                    }}
                  >
                    {seg.name}
                  </span>
                  <strong
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      whiteSpace: 'nowrap',
                      fontSize: on ? 15 : 13.5,
                      fontWeight: on ? 800 : 600,
                    }}
                  >
                    {seg.amount}
                    <small
                      style={{ marginLeft: 5, fontSize: 11.5, fontWeight: 500, color: 'var(--wl-color-text-secondary)' }}
                    >
                      {seg.percent}%
                    </small>
                  </strong>
                </button>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}
