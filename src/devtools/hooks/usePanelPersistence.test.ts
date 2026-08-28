import { describe, expect, it } from 'vitest'
import {
  clampFloatFrame,
  defaultFloatCorner,
  defaultFloatFrame,
  nextFloatZIndex,
  panelStyle,
  releaseFloatInstance,
  takeCollapsedSlot,
  takeOpenStagger,
} from './usePanelPersistence.ts'

describe('panel persistence helpers', () => {
  it('assigns distinct open stagger and collapsed slots per instance', () => {
    const a = 'inst-a'
    const b = 'inst-b'
    expect(takeOpenStagger(a)).toBe(0)
    expect(takeOpenStagger(b)).toBe(1)
    expect(takeOpenStagger(a)).toBe(0)
    expect(takeCollapsedSlot(a)).toBe(0)
    expect(takeCollapsedSlot(b)).toBe(1)
    releaseFloatInstance(a)
    expect(takeOpenStagger(a)).toBe(0)
    releaseFloatInstance(a)
    releaseFloatInstance(b)
  })

  it('raises z-index monotonically', () => {
    const first = nextFloatZIndex()
    const second = nextFloatZIndex()
    expect(second).toBeGreaterThan(first)
  })

  it('clamps frames inside the viewport and styles panels', () => {
    const frame = clampFloatFrame({ x: -40, y: -10, width: 80, height: 80 })
    expect(frame.x).toBeGreaterThanOrEqual(16)
    expect(frame.y).toBeGreaterThanOrEqual(16)
    expect(frame.width).toBeGreaterThanOrEqual(280)
    expect(frame.height).toBeGreaterThanOrEqual(220)

    expect(defaultFloatCorner('inline')).toBe('bottom-right')
    expect(defaultFloatFrame('bottom-left', 1).x).toBeGreaterThan(16)

    const collapsed = panelStyle({
      position: 'bottom-right',
      open: false,
      frame: null,
      zIndex: 1,
      collapsedSlot: 1,
    })
    expect(collapsed).toMatchObject({ right: 16, bottom: 16 + 52 })

    const inline = panelStyle({
      position: 'inline',
      open: true,
      frame: null,
      zIndex: 1,
      collapsedSlot: null,
    })
    expect(inline.position).toBe('relative')
  })
})
