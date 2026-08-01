import { useId } from 'react'
import { Icon } from './Icon'

// eslint-disable-next-line react-refresh/only-export-components -- 디자인 시스템 AmountInput.d.ts 계약에 포함된 export
export function toAmountDigits(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[^\d]/g, '')
}

// eslint-disable-next-line react-refresh/only-export-components -- 디자인 시스템 AmountInput.d.ts 계약에 포함된 export
export function formatAmountInput(value: string | number | null | undefined): string {
  const digits = toAmountDigits(value)
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

/** 금액 전용 입력. 세 자리 콤마를 자동으로 넣고 오른쪽 정렬 + '원' 접미사를 붙입니다. */
export interface AmountInputProps {
  label: string
  /** 숫자만 담긴 문자열('12000'). 표시 포맷은 컴포넌트가 만듭니다. */
  value: string
  /** 숫자만 남긴 문자열을 돌려줍니다. */
  onChange: (digits: string) => void
  error?: string
  hint?: string
  id?: string
  disabled?: boolean
  placeholder?: string
}

export function AmountInput({
  label,
  value,
  onChange,
  error,
  hint,
  id,
  disabled,
  placeholder = '0',
}: AmountInputProps) {
  const autoId = useId()
  const inputId = id || autoId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  return (
    <div className="wl-field">
      <label className="wl-field-label" htmlFor={inputId}>
        {label}
      </label>
      <div className="wl-input-wrap">
        <input
          aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          aria-invalid={error ? true : undefined}
          className={['wl-input', 'wl-input--amount', error ? 'wl-input--error' : ''].filter(Boolean).join(' ')}
          disabled={disabled}
          id={inputId}
          inputMode="numeric"
          onChange={(event) => onChange && onChange(toAmountDigits(event.target.value))}
          placeholder={placeholder}
          value={formatAmountInput(value)}
        />
        <span className="wl-input-suffix">원</span>
      </div>
      {hint && !error ? (
        <p className="wl-field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className="wl-field-error" id={errorId} role="alert">
          <Icon name="circle-alert" size="sm" />
          {error}
        </p>
      ) : null}
    </div>
  )
}
