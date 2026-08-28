import type { PointerEvent as ReactPointerEvent } from 'react'

export type ResizeHandleProps = {
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) => void
  onPointerCancel: (event: ReactPointerEvent<HTMLButtonElement>) => void
}

/** Bottom-right resize control for floating DevTools panels. */
export function ResizeHandle(props: ResizeHandleProps) {
  return (
    <button
      type="button"
      className="fd-resize"
      aria-label="Resize DevTools"
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerCancel}
    />
  )
}
