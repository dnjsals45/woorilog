/** 데이터 로딩 자리표시자. 스피너 대신 이걸 씁니다. */
export interface SkeletonProps {
  width?: number | string
  height?: number | string
  radius?: number | string
  className?: string
}

export function Skeleton({ width = '100%', height = '14px', radius, className = '' }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`wl-skeleton ${className}`.trim()}
      style={{ display: 'block', width, height, borderRadius: radius }}
    />
  )
}
