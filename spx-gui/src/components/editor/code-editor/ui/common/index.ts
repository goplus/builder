import { Icon } from '@/components/editor/code-editor/EditorUI'

export * from './monaco-editor-core'

import IconListen from '../icons/listen.svg?raw'
import IconRead from '../icons/read.svg?raw'
import IconEffect from '../icons/effect.svg?raw'
import IconCode from '../icons/code.svg?raw'
import IconAIAbility from '../icons/ai-helper.svg?raw'

/** transform icon enum to raw svg html content */
export function icon2SVG(icon: Icon): string {
  switch (icon) {
    case Icon.Function:
      return IconEffect
    case Icon.Event:
      return IconListen
    case Icon.Prototype:
      return IconRead
    case Icon.Keywords:
      return IconCode
    case Icon.AIAbility:
      return IconAIAbility
    case Icon.Document:
      return IconEffect
    case Icon.Rename:
      return IconEffect
    case Icon.Playlist:
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
