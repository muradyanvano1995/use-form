import type { CSSProperties, ReactNode } from 'react'
import { DEVTOOLS_STYLES } from '../styles.ts'

export type DevToolsPanelProps = {
  placement: string
  floating: boolean
  style: CSSProperties
  onActivate?: () => void
  children: ReactNode
}

/** Host shell: theming, positioning attributes, and portal-ready aside. */
export function DevToolsPanel(props: DevToolsPanelProps) {
  return (
    <aside
      data-form-devtools=""
      data-position={props.placement}
      data-floating={props.floating ? '' : undefined}
      style={props.style}
      aria-label="Form DevTools"
      onPointerDownCapture={props.onActivate}
    >
      <style>{DEVTOOLS_STYLES}</style>
      {props.children}
    </aside>
  )
}
