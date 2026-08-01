/* 예산 소진율 공통 규칙: 60% 미만 초록 · 60~90% 경고 · 90% 이상 주의. */
function toneForValue(value: number): Exclude<ProgressProps['tone'], 'auto' | undefined> {
  if (value >= 90) return 'danger'
  if (value >= 60) return 'warning'
  return 'brand'
}

/** 예산 소진율 막대. 기본값 auto는 60%에서 주황, 90%에서 빨강으로 스스로 바뀝니다. */
export interface ProgressProps {
  /** 0~100+ 퍼센트. 100을 넘겨도 그대로 넘기세요(초과 판정에 씁니다). */
  value: number
  tone?: 'auto' | 'brand' | 'warning' | 'danger'
  label?: string
  caption?: string
}

export function Progress({ value, tone = 'auto', label, caption }: ProgressProps) {
  const resolved = tone === 'auto' ? toneForValue(value) : tone
  const width = Math.min(Math.max(value, 0), 100)
  return (
    <div className={`wl-progress wl-progress--${resolved}`}>
      {label || caption ? (
        <div className="wl-progress-header">
          {label ? <span className="wl-label">{label}</span> : null}
          {caption ? <span className="wl-meta">{caption}</span> : null}
        </div>
      ) : null}
      <div
        aria-label={label}
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={Math.round(value)}
        aria-valuetext={`${Math.round(value)}%`}
        className="wl-progress-track"
        role="progressbar"
      >
        <div className="wl-progress-bar" style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}
