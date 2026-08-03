import { Fragment } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

/* 라벨 + 큰 금액 + 보조 설명 + 상세 링크.
 * 금액 크기는 실제 화면에서 쓰이는 네 단계입니다 — 모달 보조 20 / 기본 지표 24 / 모달 주지표 28 / 히어로 44.
 * 실제 font-size 는 patterns/controls.css 의 .wl-stat-amount 가 갖습니다 —
 * 좁은 화면에서 44px 금액은 자릿수가 늘면 바로 넘치기 때문에 미디어 쿼리로 줄여야 하고,
 * 인라인 스타일은 미디어 쿼리로 덮을 수 없습니다. 여기서는 단계 이름만 넘깁니다. */
type StatSize = 'sm' | 'md' | 'lg' | 'hero'

export interface StatProgress {
  /** 0–100. 100을 넘겨도 막대는 100%에서 멈춥니다. */
  percent: number
  /** 소진율 색. 60% 미만 brand · 60~90% amber · 90% 이상 danger 관례를 따릅니다. */
  color?: string
  /** 막대 아래 왼쪽 (예: '1,120,000원 중 812,000원 사용'). */
  left?: string
  /** 막대 아래 오른쪽 (예: '사용률 72%'). */
  right?: string
}

/**
 * 라벨 + 큰 금액 + 보조 설명 + 상세 링크. 대시보드와 분석 화면의 지표 단위입니다.
 * 카드가 아니라 **면 위에 놓이는 텍스트 블록**입니다 — 테두리나 배경이 없습니다.
 */
export interface StatBlockProps {
  label: string
  /** 라벨 앞 아이콘 이름. */
  icon?: IconName
  /** 이미 포맷된 금액 문자열 (예: '308,000원'). */
  amount: string
  note?: string
  /** 금액 색. 수입은 var(--wl-data-blue-ink), 초과는 var(--wl-color-danger). */
  tone?: string
  /** 금액 크기 — sm 20px · md 24px(기본) · lg 28px · hero 44px. 모달 주지표는 lg, 보조는 sm입니다. */
  size?: StatSize
  progress?: StatProgress
  action?: { label: string; onClick?: () => void }
  children?: ReactNode
}

export function StatBlock({
  label,
  icon,
  amount,
  note,
  tone,
  size = 'md',
  progress,
  action,
  children,
}: StatBlockProps) {
  const hero = size === 'hero'
  return (
    <div className="wl-stat">
      <p
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          margin: 0,
          fontSize: 13.5,
          fontWeight: 600,
          color: 'var(--wl-color-text-secondary)',
        }}
      >
        {icon ? <Icon name={icon} size="sm" /> : null}
        {label}
      </p>
      <p
        className={`wl-stat-amount wl-stat-amount--${size}`}
        style={{
          margin: hero ? '6px 0 0' : size === 'md' ? '8px 0 0' : '7px 0 0',
          color: tone || 'var(--wl-color-text-main)',
        }}
      >
        {amount}
      </p>
      {progress ? (
        <Fragment>
          <div className="dashboard-budget-progress" style={{ marginTop: 16, height: 8 }}>
            <span
              style={{
                width: Math.min(100, progress.percent) + '%',
                background: progress.color || 'var(--wl-color-primary)',
              }}
            />
          </div>
          {progress.left || progress.right ? (
            <p
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                margin: '8px 0 0',
                fontSize: 12.5,
                color: 'var(--wl-color-text-secondary)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span>{progress.left}</span>
              <span>{progress.right}</span>
            </p>
          ) : null}
        </Fragment>
      ) : null}
      {note ? (
        <p
          style={{
            margin: hero ? '14px 0 0' : '6px 0 0',
            fontSize: hero ? 13.5 : 12.5,
            lineHeight: hero ? 1.6 : 1.5,
            wordBreak: 'keep-all',
            color: hero ? 'var(--wl-color-text-body)' : 'var(--wl-color-text-secondary)',
          }}
        >
          {note}
        </p>
      ) : null}
      {children}
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: hero ? 6 : 5,
            minHeight: hero ? 44 : 40,
            margin: hero ? '8px 0 0 -12px' : '4px 0 0 -10px',
            padding: hero ? '0 12px' : '0 10px',
            borderRadius: hero ? 12 : 10,
            fontSize: hero ? 13 : 12.5,
            fontWeight: 700,
            color: 'var(--wl-color-primary-dark)',
          }}
        >
          {action.label}
          <Icon name="chevron-right" size="sm" />
        </button>
      ) : null}
    </div>
  )
}
