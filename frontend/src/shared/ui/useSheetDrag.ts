import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'

interface DragState {
  pointerId: number
  startY: number
  startTime: number
  lastY: number
}

/**
 * 바텀시트를 손잡이로 잡아 끌어 닫는 제스처.
 *
 * 끌리는 동안 바꾸는 건 패널의 `--wl-sheet-drag` 하나뿐이라 레이아웃 계산이 다시 돌지 않습니다.
 * 놓았을 때 **빠르게 튕겼거나**(속도) **충분히 내려왔으면**(거리) 닫고, 아니면 제자리로 돌아옵니다.
 * 속도를 같이 보는 이유는, 짧게 튕겨 닫는 손버릇이 거리 기준만으로는 무시되기 때문입니다.
 *
 * 반환한 `gripProps` 를 손잡이에, `panelRef` 를 패널에, `stateClass` 를 패널 className 에 붙입니다.
 */
export function useSheetDrag(onClose?: () => void) {
  const panelRef = useRef<HTMLElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const settleTimerRef = useRef<number | undefined>(undefined)
  const [phase, setPhase] = useState<'idle' | 'dragging' | 'settling'>('idle')

  function setDrag(value: number) {
    panelRef.current?.style.setProperty('--wl-sheet-drag', `${value}px`)
  }

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (!onClose || event.button !== 0) return
    window.clearTimeout(settleTimerRef.current)
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startTime: event.timeStamp,
      lastY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setPhase('dragging')
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    drag.lastY = event.clientY
    const delta = event.clientY - drag.startY
    // 위로 끄는 건 열림 방향이 아닙니다. 저항을 크게 줘서 "여기가 끝"이라는 걸 손으로 알려줍니다.
    setDrag(delta >= 0 ? delta : delta / 6)
  }

  function endDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    const delta = Math.max(0, drag.lastY - drag.startY)
    const velocity = delta / Math.max(1, event.timeStamp - drag.startTime)
    const height = panelRef.current?.offsetHeight ?? 1
    if (velocity > 0.6 || delta > height * 0.28) {
      onClose?.()
      return
    }
    setPhase('settling')
    setDrag(0)
    settleTimerRef.current = window.setTimeout(() => setPhase('idle'), 240)
  }

  return {
    panelRef,
    stateClass: phase === 'dragging' ? ' wl-sheet--dragging' : phase === 'settling' ? ' wl-sheet--settling' : '',
    gripProps: {
      onPointerCancel: endDrag,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
    },
  }
}
