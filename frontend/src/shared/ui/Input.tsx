import { useId } from 'react'
import type { InputHTMLAttributes } from 'react'
import { Icon } from './Icon'

/** 라벨·힌트·오류를 한 묶음으로 렌더하는 기본 텍스트 입력. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** 항상 필수입니다. placeholder로 라벨을 대신하지 않습니다. */
  label: string
  /** 값이 있으면 빨간 테두리 + role="alert" 메시지가 붙고 hint는 숨겨집니다. */
  error?: string
  hint?: string
}

export function Input({ label, error, hint, id, className = '', disabled, ...rest }: InputProps) {
  const autoId = useId()
  const inputId = id || autoId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  return (
    <div className="wl-field">
      <label className="wl-field-label" htmlFor={inputId}>
        {label}
      </label>
      <input
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        aria-invalid={error ? true : undefined}
        className={['wl-input', error ? 'wl-input--error' : '', className].filter(Boolean).join(' ')}
        disabled={disabled}
        id={inputId}
        {...rest}
      />
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
