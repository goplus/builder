export * from './monaco-editor-core'

import IconListen from '../icons/listen.svg?raw'
import IconRead from '../icons/read.svg?raw'
import IconEffect from '../icons/effect.svg?raw'
import IconCode from '../icons/code.svg?raw'
import IconAIAbility from '../icons/ai-helper.svg?raw'

export enum IconEnum {
  Function,
  Event,
  Prototype,
  Keywords,
  AIAbility,
  Document,
  Rename,
  List
}

export type Icon = IconEnum

/** transform icon enum to raw svg html content */
export function Icon2SVG(icon: Icon): string {
  switch (icon) {
    case IconEnum.Function:
      return IconEffect
    case IconEnum.Event:
      return IconListen
    case IconEnum.Prototype:
      return IconRead
    case IconEnum.Keywords:
      return IconCode
    case IconEnum.AIAbility:
      return IconAIAbility
    case IconEnum.Document:
      return IconEffect
    case IconEnum.Rename:
      return IconEffect
    case IconEnum.List:
      return IconEffect
  }
}

/** Determine whether checkElement is closer to the top or bottom of containerElement */
export function determineClosestEdge(
  containerElement: HTMLElement,
  checkElement: HTMLElement
): 'top' | 'bottom' {
  const containerRect = containerElement.getBoundingClientRect()
  const elementRect = checkElement.getBoundingClientRect()

  const topDistance = elementRect.top - containerRect.top
  const bottomDistance = containerRect.bottom - elementRect.bottom

  return topDistance < bottomDistance ? 'top' : 'bottom'
}

/** Check whether checkElement is in viewport of containerElement */
export function isElementInViewport(containerElement: Element, checkElement: Element): boolean {
  const containerRect = containerElement.getBoundingClientRect()
  const elementRect = checkElement.getBoundingClientRect()
  return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom
}

/** normalize icon size to static size, like npm package XIcon component */
export function normalizeIconSize(targetElement: Element | null, size: number): undefined {
  const innerSvgElement = targetElement?.firstElementChild
  if (!innerSvgElement) return
  innerSvgElement.setAttribute('height', String(size))
  innerSvgElement.setAttribute('width', String(size))
}
