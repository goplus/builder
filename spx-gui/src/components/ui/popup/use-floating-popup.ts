import {
  arrow as floatingArrow,
  autoUpdate,
  computePosition,
  flip,
  offset as floatingOffset,
  shift,
  type Placement as FloatingPlacement,
  type VirtualElement
} from '@floating-ui/dom'
import { ref, toValue, watchEffect, type CSSProperties, type MaybeRefOrGetter } from 'vue'
import { getCleanupSignal } from '@/utils/disposable'

export type PopupPlacement = FloatingPlacement

export type PopupOffset = {
  x: number
  y: number
}

export type PopupVirtualAnchor = {
  x: number
  y: number
  width?: number
  height?: number
}

export type UseFloatingPopupOptions = {
  visible: MaybeRefOrGetter<boolean>
  placement?: MaybeRefOrGetter<PopupPlacement>
  offset?: MaybeRefOrGetter<PopupOffset>
  virtualAnchor?: MaybeRefOrGetter<PopupVirtualAnchor | null>
  showArrow?: MaybeRefOrGetter<boolean>
  shiftPadding?: number
}

export function useFloatingPopup(options: UseFloatingPopupOptions) {
  const referenceRef = ref<HTMLElement | null>(null)
  const floatingRef = ref<HTMLElement | null>(null)
  const arrowRef = ref<HTMLElement | null>(null)
  const floatingStyle = ref<CSSProperties | null>(null)
  const arrowStyle = ref<CSSProperties | null>(null)

  async function updatePosition(signal?: AbortSignal) {
    const floatingEl = floatingRef.value
    const virtualAnchor = resolveMaybeRef(options.virtualAnchor)
    const reference = resolveReferenceElement(referenceRef.value, virtualAnchor)
    if (floatingEl == null || reference == null) return

    const placement = resolveMaybeRef(options.placement, 'bottom')
    const popupOffset = resolveMaybeRef(options.offset, { x: 0, y: 0 })
    const shouldShowArrow = resolveMaybeRef(options.showArrow, false)
    const arrowEl = shouldShowArrow ? arrowRef.value : null
    const middleware = [
      floatingOffset(resolveFloatingOffset(placement, popupOffset)),
      flip(),
      shift({ padding: options.shiftPadding ?? 8 })
    ]
    if (arrowEl != null) middleware.push(floatingArrow({ element: arrowEl }))

    const {
      x,
      y,
      strategy,
      placement: resolvedPlacement,
      middlewareData
    } = await computePosition(reference, floatingEl, {
      strategy: 'fixed',
      placement,
      middleware
    })

    if (signal?.aborted) return

    floatingStyle.value = {
      position: strategy,
      left: `${x}px`,
      top: `${y}px`
    }
    arrowStyle.value = shouldShowArrow ? resolveArrowStyle(resolvedPlacement, middlewareData.arrow ?? null) : null
  }

  watchEffect((onCleanup) => {
    const signal = getCleanupSignal(onCleanup)
    const visible = toValue(options.visible)
    const floatingEl = floatingRef.value
    const virtualAnchor = resolveMaybeRef(options.virtualAnchor)
    const reference = resolveReferenceElement(referenceRef.value, virtualAnchor)
    if (options.showArrow != null) void resolveMaybeRef(options.showArrow, false)
    if (options.placement != null) void resolveMaybeRef(options.placement, 'bottom')
    if (options.offset != null) void resolveMaybeRef(options.offset, { x: 0, y: 0 })

    if (!visible || floatingEl == null || reference == null) {
      floatingStyle.value = null
      arrowStyle.value = null
      return
    }

    const cleanup = autoUpdate(reference, floatingEl, () => {
      void updatePosition(signal)
    })
    void updatePosition(signal)

    onCleanup(() => {
      cleanup()
    })
  })

  return {
    referenceRef,
    floatingRef,
    arrowRef,
    floatingStyle,
    arrowStyle
  }
}

function resolveMaybeRef<T>(value: MaybeRefOrGetter<T> | null | undefined): T | null
function resolveMaybeRef<T>(value: MaybeRefOrGetter<T> | null | undefined, fallback: T): T
function resolveMaybeRef<T>(value: MaybeRefOrGetter<T> | null | undefined, fallback?: T) {
  const resolved = value == null ? undefined : toValue(value)
  return resolved ?? fallback ?? null
}

export function resolveFloatingOffset(placement: PopupPlacement, offset: PopupOffset) {
  const side = placement.split('-')[0]
  if (side === 'left' || side === 'right') {
    return {
      mainAxis: offset.x,
      crossAxis: offset.y
    }
  }
  return {
    mainAxis: offset.y,
    crossAxis: offset.x
  }
}

const placementTransformOrigins: Record<PopupPlacement, string> = {
  'bottom-start': 'top left',
  bottom: 'top center',
  'bottom-end': 'top right',
  'top-start': 'bottom left',
  top: 'bottom center',
  'top-end': 'bottom right',
  'right-start': 'top left',
  right: 'center left',
  'right-end': 'bottom left',
  'left-start': 'top right',
  left: 'center right',
  'left-end': 'bottom right'
}

export function resolvePopupTransformOrigin(
  placement: PopupPlacement,
  arrowStyle: CSSProperties | null,
  options: { showArrow?: boolean; arrowSize?: number } = {}
) {
  if (!options.showArrow) return placementTransformOrigins[placement]

  const arrowSize = options.arrowSize ?? 8
  const side = placement.split('-')[0]
  const arrowLeft = readPx(arrowStyle?.left)
  const arrowTop = readPx(arrowStyle?.top)
  const halfArrow = `${arrowSize / 2}px`

  switch (side) {
    case 'bottom':
      return arrowLeft == null ? placementTransformOrigins[placement] : `calc(${arrowLeft}px + ${halfArrow}) top`
    case 'top':
      return arrowLeft == null ? placementTransformOrigins[placement] : `calc(${arrowLeft}px + ${halfArrow}) bottom`
    case 'right':
      return arrowTop == null ? placementTransformOrigins[placement] : `left calc(${arrowTop}px + ${halfArrow})`
    default:
      return arrowTop == null ? placementTransformOrigins[placement] : `right calc(${arrowTop}px + ${halfArrow})`
  }
}

export function createVirtualAnchor(anchor: PopupVirtualAnchor): VirtualElement {
  const width = anchor.width ?? 0
  const height = anchor.height ?? 0
  return {
    getBoundingClientRect() {
      return {
        x: anchor.x,
        y: anchor.y,
        top: anchor.y,
        left: anchor.x,
        width,
        height,
        right: anchor.x + width,
        bottom: anchor.y + height
      } as DOMRect
    }
  }
}

function resolveReferenceElement(referenceEl: HTMLElement | null, virtualAnchor: PopupVirtualAnchor | null) {
  if (virtualAnchor != null) return createVirtualAnchor(virtualAnchor)
  return referenceEl
}

function resolveArrowStyle(placement: PopupPlacement, coords: { x?: number; y?: number } | null): CSSProperties {
  const side = placement.split('-')[0]
  const oppositeSide = getOppositeSide(side)
  const isVerticalPlacement = side === 'top' || side === 'bottom'
  return {
    left: isVerticalPlacement ? (coords?.x == null ? '' : `${coords.x}px`) : '',
    top: !isVerticalPlacement ? (coords?.y == null ? '' : `${coords.y}px`) : '',
    right: '',
    bottom: '',
    [oppositeSide]: '-4px'
  }
}

function getOppositeSide(side: string) {
  switch (side) {
    case 'top':
      return 'bottom'
    case 'right':
      return 'left'
    case 'bottom':
      return 'top'
    default:
      return 'right'
  }
}

function readPx(value: CSSProperties['left']) {
  if (typeof value !== 'string') return null
  if (!value.endsWith('px')) return null
  const num = Number(value.slice(0, -2))
  return Number.isFinite(num) ? num : null
}
