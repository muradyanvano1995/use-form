import type { CSSProperties } from 'react'
import type { DevToolsPosition } from '../safeSerialize.ts'

export type FloatFrame = {
  x: number
  y: number
  width: number
  height: number
}

export const FLOAT_MARGIN = 16
export const FLOAT_DEFAULT_WIDTH = 400
const FLOAT_MIN_WIDTH = 280
const FLOAT_MIN_HEIGHT = 220
const FLOAT_OPEN_STAGGER = 28
const FLOAT_COLLAPSED_STACK = 52
const FLOAT_Z_BASE = 100_000

let floatZCounter = FLOAT_Z_BASE
const floatOpenStaggerByKey = new Map<string, number>()
const floatCollapsedSlotByKey = new Map<string, number>()

function takeSlot(map: Map<string, number>, key: string): number {
  const existing = map.get(key)
  if (existing != null) return existing
  const used = new Set(map.values())
  let index = 0
  while (used.has(index)) index += 1
  map.set(key, index)
  return index
}

/** Cross-instance z-order / open stagger / collapsed stacking for floating DevTools. */
export function nextFloatZIndex(): number {
  floatZCounter += 1
  return floatZCounter
}

export function takeOpenStagger(key: string): number {
  return takeSlot(floatOpenStaggerByKey, key)
}

export function takeCollapsedSlot(key: string): number {
  return takeSlot(floatCollapsedSlotByKey, key)
}

export function releaseCollapsedSlot(key: string): void {
  floatCollapsedSlotByKey.delete(key)
}

export function releaseFloatInstance(key: string): void {
  floatOpenStaggerByKey.delete(key)
  floatCollapsedSlotByKey.delete(key)
}

export function defaultFloatCorner(
  position: DevToolsPosition,
): Exclude<DevToolsPosition, 'inline'> {
  return position === 'bottom-left' ? 'bottom-left' : 'bottom-right'
}

export function defaultFloatFrame(
  corner: Exclude<DevToolsPosition, 'inline'>,
  stagger = 0,
): FloatFrame {
  const width = FLOAT_DEFAULT_WIDTH
  const height = Math.min(typeof window === 'undefined' ? 480 : window.innerHeight * 0.72, 680)
  const viewportWidth = typeof window === 'undefined' ? width + FLOAT_MARGIN * 2 : window.innerWidth
  const viewportHeight =
    typeof window === 'undefined' ? height + FLOAT_MARGIN * 2 : window.innerHeight
  const offset = stagger * FLOAT_OPEN_STAGGER
  return {
    width,
    height,
    x:
      corner === 'bottom-left'
        ? FLOAT_MARGIN + offset
        : Math.max(FLOAT_MARGIN, viewportWidth - width - FLOAT_MARGIN - offset),
    y: Math.max(FLOAT_MARGIN, viewportHeight - height - FLOAT_MARGIN - offset),
  }
}

export function clampFloatFrame(frame: FloatFrame): FloatFrame {
  const viewportWidth =
    typeof window === 'undefined' ? frame.width + FLOAT_MARGIN * 2 : window.innerWidth
  const viewportHeight =
    typeof window === 'undefined' ? frame.height + FLOAT_MARGIN * 2 : window.innerHeight
  const width = Math.min(
    Math.max(frame.width, FLOAT_MIN_WIDTH),
    Math.max(FLOAT_MIN_WIDTH, viewportWidth - FLOAT_MARGIN * 2),
  )
  const height = Math.min(
    Math.max(frame.height, FLOAT_MIN_HEIGHT),
    Math.max(FLOAT_MIN_HEIGHT, viewportHeight - FLOAT_MARGIN * 2),
  )
  const maxX = Math.max(FLOAT_MARGIN, viewportWidth - width - FLOAT_MARGIN)
  const maxY = Math.max(FLOAT_MARGIN, viewportHeight - height - FLOAT_MARGIN)
  return {
    width,
    height,
    x: Math.min(Math.max(frame.x, FLOAT_MARGIN), maxX),
    y: Math.min(Math.max(frame.y, FLOAT_MARGIN), maxY),
  }
}

export function panelStyle(options: {
  position: DevToolsPosition
  open: boolean
  frame: FloatFrame | null
  zIndex: number
  collapsedSlot: number | null
}): CSSProperties {
  const { position, open, frame, zIndex, collapsedSlot } = options
  if (position === 'inline') {
    return {
      position: 'relative',
      marginTop: '0.85rem',
      width: '100%',
      maxWidth: '100%',
    }
  }
  if (!open) {
    return {
      position: 'fixed',
      zIndex,
      right: FLOAT_MARGIN,
      bottom: FLOAT_MARGIN + (collapsedSlot ?? 0) * FLOAT_COLLAPSED_STACK,
      width: 'auto',
      height: 'auto',
    }
  }
  if (frame) {
    return {
      position: 'fixed',
      zIndex,
      left: frame.x,
      top: frame.y,
      width: frame.width,
      height: frame.height,
      maxWidth: `calc(100vw - ${FLOAT_MARGIN * 2}px)`,
      maxHeight: `calc(100vh - ${FLOAT_MARGIN * 2}px)`,
      display: 'flex',
      flexDirection: 'column',
    }
  }
  return {
    position: 'fixed',
    zIndex,
    bottom: FLOAT_MARGIN,
    [position === 'bottom-left' ? 'left' : 'right']: FLOAT_MARGIN,
    width: FLOAT_DEFAULT_WIDTH,
    maxWidth: `calc(100vw - ${FLOAT_MARGIN * 2}px)`,
    maxHeight: 'min(72vh, 680px)',
    display: 'flex',
    flexDirection: 'column',
  }
}
