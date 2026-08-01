/** 2~4개의 배타적 선택지를 알약 형태로 전환합니다. 탭 내비게이션 대용으로 쓰지 않습니다. */
export interface SegmentedOption {
  value: string
  label: string
}

export interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  /** radiogroup의 접근성 이름. */
  label: string
}

export function SegmentedControl({ options, value, onChange, label }: SegmentedControlProps) {
  return (
    <div aria-label={label} className="wl-segmented" role="radiogroup">
      {options.map((option) => (
        <button
          aria-checked={option.value === value}
          className="wl-segmented-option"
          key={option.value}
          onClick={() => onChange(option.value)}
          role="radio"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
