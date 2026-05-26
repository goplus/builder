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
import { ref, toValue, watch, type CSSProperties, type WatchSource } from 'vue'
import { getCleanupSignal } from '@/utils/disposable'

type ResolvedPopupState = {
  visible: boolean
  reference: Element | VirtualElement | null
  floatingEl: HTMLElement | null
  arrowEl: HTMLElement | null
  placement: PopupPlacement
  popupOffset: PopupOffset
  showArrow: boolean
}

export type PopupPlacement = FloatingPlacement

// Popup arrows currently use the same size everywhere in the project, so keep
// a single fixed constant here instead of threading a configurable value.
export const POPUP_ARROW_SIZE = 8
const POPUP_ARROW_HALF_SIZE = POPUP_ARROW_SIZE / 2

type PopupArrowCoords = {
  x?: number
  y?: number
}

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
  visible: WatchSource<boolean>
  placement?: WatchSource<PopupPlacement>
  offset?: WatchSource<PopupOffset>
  virtualAnchor?: WatchSource<PopupVirtualAnchor | null>
  showArrow?: boolean
  shiftPadding?: number
}

export function useFloatingPopup(options: UseFloatingPopupOptions) {
  const referenceRef = ref<Element | null>(null)
  const floatingRef = ref<HTMLElement | null>(null)
  const arrowRef = ref<HTMLElement | null>(null)
  const floatingStyle = ref<CSSProperties | null>(null)
  const arrowStyle = ref<CSSProperties | null>(null)

  async function updatePosition(state: ResolvedPopupState, signal?: AbortSignal) {
    const { arrowEl, floatingEl, placement, popupOffset, reference, showArrow } = state
    if (floatingEl == null || reference == null) return

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

    const arrowCoords = showArrow ? middlewareData.arrow ?? null : null
    const transformOrigin = resolvePopupTransformOrigin(resolvedPlacement, arrowCoords)
    floatingStyle.value = {
      position: strategy,
      left: `${x}px`,
      top: `${y}px`,
      '--ui-popup-transform-origin': transformOrigin
    }
    arrowStyle.value = arrowCoords == null ? null : resolveArrowStyle(resolvedPlacement, arrowCoords)
  }

  watch(
    () => resolvePopupState(options, referenceRef.value, floatingRef.value, arrowRef.value),
    (state, _, onCleanup) => {
      const signal = getCleanupSignal(onCleanup)

      if (!state.visible || state.floatingEl == null || state.reference == null) {
        floatingStyle.value = null
        arrowStyle.value = null
        return
      }

      const cleanup = autoUpdate(state.reference, state.floatingEl, () => {
        void updatePosition(state, signal)
      })

      onCleanup(() => {
        cleanup()
      })
    },
    { immediate: true }
  )

  return {
    referenceRef,
    floatingRef,
    arrowRef,
    floatingStyle,
    arrowStyle
  }
}

function resolvePopupState(
  options: UseFloatingPopupOptions,
  referenceEl: Element | null,
  floatingEl: HTMLElement | null,
  arrowEl: HTMLElement | null
): ResolvedPopupState {
  const virtualAnchor = options.virtualAnchor == null ? null : toValue(options.virtualAnchor)
  const showArrow = options.showArrow ?? false
  const placement = options.placement == null ? 'bottom' : toValue(options.placement)
  return {
    visible: toValue(options.visible),
    // Dropdowns can be anchored either to a real trigger element or to an
    // explicit screen coordinate for context-menu style positioning.
    reference: resolveReferenceElement(referenceEl, virtualAnchor),
    floatingEl,
    arrowEl: showArrow ? arrowEl : null,
    placement,
    popupOffset: options.offset == null ? resolveDefaultPopupOffset(placement, showArrow) : toValue(options.offset),
    showArrow
  }
}

export function resolveDefaultPopupOffset(placement: PopupPlacement, showArrow: boolean): PopupOffset {
  if (!showArrow) return { x: 0, y: 0 }
  const side = placement.split('-')[0]
  // When an arrow is shown, offset the popup by one arrow-size from the trigger
  // along the placement's main axis, leaving room for the arrow tip to sit in
  // the gap between the popup surface and the trigger edge.
  if (side === 'left' || side === 'right') {
    return { x: POPUP_ARROW_SIZE, y: 0 }
  }
  return { x: 0, y: POPUP_ARROW_SIZE }
}

export function resolveFloatingOffset(placement: PopupPlacement, offset: PopupOffset) {
  const side = placement.split('-')[0]
  // Consumers pass offsets in popup-friendly x/y terms. Floating UI expects
  // mainAxis/crossAxis, which swap meaning for left/right placements.
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

export function resolvePopupTransformOrigin(placement: PopupPlacement, arrowCoords: PopupArrowCoords | null) {
  // Without arrow coordinates, fall back to a placement-based origin. When the
  // arrow is present, bias the animation origin toward the arrow center so the
  // popup feels attached to the trigger point.
  if (arrowCoords == null) return placementTransformOrigins[placement]

  const side = placement.split('-')[0]
  const arrowLeft = arrowCoords.x
  const arrowTop = arrowCoords.y

  switch (side) {
    case 'bottom':
      return arrowLeft == null ? placementTransformOrigins[placement] : `${arrowLeft + POPUP_ARROW_HALF_SIZE}px top`
    case 'top':
      return arrowLeft == null ? placementTransformOrigins[placement] : `${arrowLeft + POPUP_ARROW_HALF_SIZE}px bottom`
    case 'right':
      return arrowTop == null ? placementTransformOrigins[placement] : `left ${arrowTop + POPUP_ARROW_HALF_SIZE}px`
    default:
      return arrowTop == null ? placementTransformOrigins[placement] : `right ${arrowTop + POPUP_ARROW_HALF_SIZE}px`
  }
}

export function createVirtualAnchor(anchor: PopupVirtualAnchor): VirtualElement {
  const width = anchor.width ?? 0
  const height = anchor.height ?? 0
  return {
    // Floating UI only needs a DOMRect-like measurement surface, so a virtual
    // anchor can emulate a trigger element for manual popup positioning.
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

function resolveReferenceElement(referenceEl: Element | null, virtualAnchor: PopupVirtualAnchor | null) {
  if (virtualAnchor != null) return createVirtualAnchor(virtualAnchor)
  return referenceEl
}

function resolveArrowStyle(placement: PopupPlacement, coords: PopupArrowCoords): CSSProperties {
  const side = placement.split('-')[0]
  const oppositeSide = getOppositeSide(side)
  const isVerticalPlacement = side === 'top' || side === 'bottom'
  return {
    width: `${POPUP_ARROW_SIZE}px`,
    height: `${POPUP_ARROW_SIZE}px`,
    left: isVerticalPlacement ? (coords?.x == null ? '' : `${coords.x}px`) : '',
    top: !isVerticalPlacement ? (coords?.y == null ? '' : `${coords.y}px`) : '',
    right: '',
    bottom: '',
    [oppositeSide]: `-${POPUP_ARROW_HALF_SIZE}px`
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
