import IconListen from '../ui/icons/listen.svg?raw'
import IconRead from '../ui/icons/read.svg?raw'
import IconEffect from '../ui/icons/effect.svg?raw'
import IconCode from '../ui/icons/code.svg?raw'
import IconAIAbility from '../ui/icons/ai-helper.svg?raw'

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

/**
 * transform icon enum to raw svg html content
 * @param {IconEnum} icon
 */
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

/**
 * Determine whether $el is closer to the top or bottom of $container
 * @param {HTMLElement} $container - main container element
 * @param {HTMLElement} $el - element to check
 * @returns {'top' | 'bottom'} - 'top' or 'bottom'
 */
export function determineClosestEdge($container: HTMLElement, $el: HTMLElement): 'top' | 'bottom' {
  const containerRect = $container.getBoundingClientRect()
  const elementRect = $el.getBoundingClientRect()

  const topDistance = elementRect.top - containerRect.top
  const bottomDistance = containerRect.bottom - elementRect.bottom

  return topDistance < bottomDistance ? 'top' : 'bottom'
}

/**
 * Check whether $el is in viewport of $container
 * @param {HTMLElement} $container - main container element
 * @param {HTMLElement} $el - element to check
 * @returns {boolean} - whether $el is in viewport of $container
 */
export function isElementInViewport($container: Element, $el: Element): boolean {
  const containerRect = $container.getBoundingClientRect()
  const elementRect = $el.getBoundingClientRect()
  return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom
}

/**
 * normalize icon size to static size, like npm package XIcon component.
 * @param {Element} $el - icon element
 * @param {number} size - icon size, only for square icon
 * @returns {undefined} - return `undefined` to satisfy some ts error, like vue component ref property need callback function return undefined
 */
export function normalizeIconSize($el: Element | null, size: number): undefined {
  const $icon = $el?.firstElementChild
  if (!$icon) return
  $icon.setAttribute('height', String(size))
  $icon.setAttribute('width', String(size))
}
