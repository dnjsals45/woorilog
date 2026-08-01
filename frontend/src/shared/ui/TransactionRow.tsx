import { Fragment } from 'react'
import type { CSSProperties } from 'react'
import { CategoryBadge } from './CategoryBadge'

/**
 * 거래 한 줄 — 카테고리 마크 · 사용처 · 메타 · 금액. `<li>`를 그리므로 `<ul>` 안에 넣습니다.
 * 가계부 목록과 대시보드의 최근 거래가 같은 행을 씁니다.
 * spacious는 대시보드용(68px, 15.5px)이고 기본값은 목록용(56px, 15px)입니다.
 */
export interface TransactionRowProps {
  /** CategoryBadge가 아는 카테고리 이름 (예: '식비', '장보기'). */
  category: string
  /** 사용처 (예: '이마트 성수점'). */
  place: string
  /** 날짜 · 카테고리 · 예산 주체를 모은 한 줄 (예: '8월 11일 · 장보기 · 공동'). */
  meta?: string
  /** 부호까지 포함해 포맷된 금액 (예: '-64,800원', '+3,240,000원'). */
  amount: string
  /** 결제 수단. 금액 아래에 작게 붙습니다. */
  method?: string
  /** 어느 예산에서 나갔는지 알려주는 칩 (예: '공동'). */
  budget?: string
  /** 수입이면 금액이 파란 잉크로 표시됩니다. */
  income?: boolean
  /** 대시보드 최근 거래용 여백(68px). 기본값은 목록용(56px). */
  spacious?: boolean
  /** 목록 첫 행은 false로 두어 이중선을 피합니다. */
  divider?: boolean
  href?: string
  onClick?: () => void
}

export function TransactionRow({
  category,
  place,
  meta,
  amount,
  method,
  budget,
  income = false,
  spacious = false,
  divider = true,
  href,
  onClick,
}: TransactionRowProps) {
  const inner = (
    <Fragment>
      <CategoryBadge name={category} size="sm" />
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <strong
            style={{
              fontSize: spacious ? 15.5 : 15,
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {place}
          </strong>
          {budget ? (
            <span
              style={{
                flex: 'none',
                padding: '2px 7px',
                borderRadius: 'var(--wl-radius-pill)',
                background: 'var(--wl-color-surface-subtle)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--wl-color-text-secondary)',
              }}
            >
              {budget}
            </span>
          ) : null}
        </span>
        <span
          style={{ display: 'block', marginTop: 4, fontSize: spacious ? 13 : 12, color: 'var(--wl-color-text-secondary)' }}
        >
          {meta}
        </span>
      </span>
      <strong
        style={{
          textAlign: 'right',
          whiteSpace: 'nowrap',
          fontSize: spacious ? 15.5 : 15,
          fontWeight: 650,
          fontVariantNumeric: 'tabular-nums',
          color: income ? 'var(--wl-data-blue-ink)' : 'var(--wl-color-text-main)',
        }}
      >
        {amount}
        {method ? (
          <span
            style={{ display: 'block', marginTop: 4, fontSize: 12, fontWeight: 500, color: 'var(--wl-color-text-secondary)' }}
          >
            {method}
          </span>
        ) : null}
      </strong>
    </Fragment>
  )

  const innerStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: (spacious ? '34px' : '36px') + ' minmax(0,1fr) auto',
    alignItems: 'center',
    gap: spacious ? 12 : 13,
    width: '100%',
    minHeight: spacious ? 68 : 56,
    padding: spacious ? '8px 10px' : '10px 18px',
    marginInline: spacious ? -10 : 0,
    borderRadius: spacious ? 12 : 0,
    textAlign: 'left',
    color: 'inherit',
  }

  return (
    <li style={{ borderTop: divider ? '1px solid var(--wl-color-border)' : 'none', listStyle: 'none' }}>
      {href ? (
        <a href={href} style={innerStyle}>
          {inner}
        </a>
      ) : (
        <button type="button" onClick={onClick} style={innerStyle}>
          {inner}
        </button>
      )}
    </li>
  )
}
