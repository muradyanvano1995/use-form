import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import type { DevToolsPosition } from '../safeSerialize.ts'
import {
  clampFloatFrame,
  defaultFloatCorner,
  defaultFloatFrame,
  nextFloatZIndex,
  panelStyle,
  releaseCollapsedSlot,
  releaseFloatInstance,
  takeCollapsedSlot,
  takeOpenStagger,
  type FloatFrame,
} from './usePanelPersistence.ts'

export type UseFloatingPanelOptions = {
  instanceId: string
  position: DevToolsPosition
  initiallyOpen: boolean
}

export function useFloatingPanel(options: UseFloatingPanelOptions) {
  const { instanceId, position, initiallyOpen } = options
  const [open, setOpen] = useState(initiallyOpen)
  const [placement, setPlacement] = useState<DevToolsPosition>(position)
  const [positionProp, setPositionProp] = useState(position)
  const [floatFrame, setFloatFrame] = useState<FloatFrame | null>(() => {
    if (position === 'inline' || typeof window === 'undefined') return null
    return defaultFloatFrame(defaultFloatCorner(position), takeOpenStagger(instanceId))
  })
  const [collapsedSlot, setCollapsedSlot] = useState<number | null>(() =>
    position !== 'inline' && !initiallyOpen ? takeCollapsedSlot(instanceId) : null,
  )
  const [stackZ, setStackZ] = useState(() => nextFloatZIndex())
  const [dragging, setDragging] = useState(false)
  const dragOffsetRef = useRef<{ pointerId: number; offsetX: number; offsetY: number } | null>(null)
  const resizeSessionRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    width: number
    height: number
  } | null>(null)

  if (position !== positionProp) {
    setPositionProp(position)
    setPlacement(position)
    releaseFloatInstance(instanceId)
    if (position === 'inline' || typeof window === 'undefined') {
      setFloatFrame(null)
      setCollapsedSlot(null)
    } else {
      setFloatFrame(defaultFloatFrame(defaultFloatCorner(position), takeOpenStagger(instanceId)))
      setCollapsedSlot(open ? null : takeCollapsedSlot(instanceId))
    }
  }

  const floatCorner = defaultFloatCorner(position)
  const floating = placement !== 'inline'

  if (floating && floatFrame == null && open && typeof window !== 'undefined') {
    setFloatFrame(defaultFloatFrame(floatCorner, takeOpenStagger(instanceId)))
  }

  useEffect(() => {
    return () => {
      releaseFloatInstance(instanceId)
    }
  }, [instanceId])

  const bringToFront = useCallback(() => {
    setStackZ(nextFloatZIndex())
  }, [])

  const toggle = useCallback(() => {
    bringToFront()
    if (floating) {
      if (open) {
        setCollapsedSlot(takeCollapsedSlot(instanceId))
      } else {
        releaseCollapsedSlot(instanceId)
        setCollapsedSlot(null)
        setFloatFrame(
          (frame) => frame ?? defaultFloatFrame(floatCorner, takeOpenStagger(instanceId)),
        )
      }
    }
    setOpen((current) => !current)
  }, [bringToFront, floatCorner, floating, instanceId, open])

  const togglePlacement = useCallback(() => {
    bringToFront()
    if (placement === 'inline') {
      const stagger = takeOpenStagger(instanceId)
      setFloatFrame((frame) => frame ?? defaultFloatFrame(floatCorner, stagger))
      if (!open) {
        setCollapsedSlot(takeCollapsedSlot(instanceId))
      }
      setPlacement(floatCorner)
      return
    }
    releaseFloatInstance(instanceId)
    setFloatFrame(null)
    setCollapsedSlot(null)
    setPlacement('inline')
  }, [bringToFront, floatCorner, instanceId, open, placement])

  const onDragPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!floating || floatFrame == null) return
      if (event.button > 0) return
      const target = event.target
      if (
        target instanceof Element &&
        target.closest('button, a, input, textarea, select, [role="tab"]')
      ) {
        return
      }
      event.preventDefault()
      bringToFront()
      dragOffsetRef.current = {
        pointerId: event.pointerId,
        offsetX: event.clientX - floatFrame.x,
        offsetY: event.clientY - floatFrame.y,
      }
      setDragging(true)
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    [bringToFront, floatFrame, floating],
  )

  const onDragPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const session = dragOffsetRef.current
    if (!session) return
    setFloatFrame((current) => {
      if (!current) return current
      return clampFloatFrame({
        ...current,
        x: event.clientX - session.offsetX,
        y: event.clientY - session.offsetY,
      })
    })
  }, [])

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragOffsetRef.current) return
    dragOffsetRef.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
  }, [])

  const onResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!floating || floatFrame == null) return
      if (event.button > 0) return
      event.preventDefault()
      event.stopPropagation()
      bringToFront()
      resizeSessionRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: floatFrame.width,
        height: floatFrame.height,
      }
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    [bringToFront, floatFrame, floating],
  )

  const onResizePointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const session = resizeSessionRef.current
    if (!session) return
    setFloatFrame((current) => {
      if (!current) return current
      return clampFloatFrame({
        ...current,
        width: session.width + (event.clientX - session.startX),
        height: session.height + (event.clientY - session.startY),
      })
    })
  }, [])

  const endResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!resizeSessionRef.current) return
    resizeSessionRef.current = null
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture?.(event.pointerId)
    }
  }, [])

  const style = panelStyle({
    position: placement,
    open,
    frame: floatFrame,
    zIndex: stackZ,
    collapsedSlot,
  })

  return {
    open,
    placement,
    floating,
    dragging,
    style,
    bringToFront,
    toggle,
    togglePlacement,
    onDragPointerDown,
    onDragPointerMove,
    endDrag,
    onResizePointerDown,
    onResizePointerMove,
    endResize,
  }
}
